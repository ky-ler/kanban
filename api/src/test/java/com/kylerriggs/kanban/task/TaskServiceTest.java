package com.kylerriggs.kanban.task;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.kanban.activity.ActivityLogService;
import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardRole;
import com.kylerriggs.kanban.board.BoardUser;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardAccessException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.label.LabelRepository;
import com.kylerriggs.kanban.task.dto.MoveTaskRequest;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    private static final String USER_ID = "auth0|user123";
    private static final String ASSIGNEE_ID = "auth0|assignee456";
    private static final UUID TASK_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");
    private static final UUID BOARD_ID = UUID.fromString("b256c2d0-891b-44de-816b-c9259cd00392");
    private static final UUID COLUMN_ID = UUID.fromString("c356c2d0-891b-44de-816b-c9259cd00393");
    private static final UUID NEW_COLUMN_ID =
            UUID.fromString("d456c2d0-891b-44de-816b-c9259cd00394");

    @Mock private TaskRepository taskRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private UserRepository userRepository;
    @Mock private ColumnRepository columnRepository;
    @Mock private LabelRepository labelRepository;
    @Mock private TaskMapper taskMapper;
    @Mock private UserService userService;
    @Mock private BoardEventPublisher eventPublisher;
    @Mock private ActivityLogService activityLogService;
    @Mock private ObjectMapper objectMapper;
    @InjectMocks private TaskService taskService;

    private User user;
    private User assignee;
    private Board board;
    private Column column;
    private Column newColumn;
    private Task task;
    private TaskDto taskDto;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(USER_ID);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setProfileImageUrl("https://example.com/image.png");

        assignee = new User();
        assignee.setId(ASSIGNEE_ID);
        assignee.setUsername("assignee");
        assignee.setEmail("assignee@example.com");
        assignee.setProfileImageUrl("https://example.com/assignee.png");

        board =
                Board.builder()
                        .id(BOARD_ID)
                        .name("Test Board")
                        .createdBy(user)
                        .tasks(new HashSet<>())
                        .collaborators(new HashSet<>())
                        .columns(new HashSet<>())
                        .build();

        BoardUser boardUser =
                BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
        board.getCollaborators().add(boardUser);

        column = Column.builder().id(COLUMN_ID).name("To Do").position(0).board(board).build();
        newColumn =
                Column.builder()
                        .id(NEW_COLUMN_ID)
                        .name("In Progress")
                        .position(1)
                        .board(board)
                        .build();

        task =
                Task.builder()
                        .id(TASK_ID)
                        .title("Test Task")
                        .description("Test Description")
                        .board(board)
                        .column(column)
                        .createdBy(user)
                        .position(0)
                        .labels(new HashSet<>())
                        .build();
        task.setDateCreated(Instant.now());
        task.setDateModified(Instant.now());

        UserSummaryDto userSummary =
                new UserSummaryDto(USER_ID, "testuser", "https://example.com/image.png");
        taskDto =
                new TaskDto(
                        TASK_ID,
                        userSummary,
                        null,
                        "Test Task",
                        "Test Description",
                        COLUMN_ID,
                        0,
                        false,
                        false,
                        null, // priority
                        null, // dueDate
                        null,
                        Instant.now().toString(),
                        Instant.now().toString());
    }

    @Nested
    class GetTaskTests {
        @Test
        void getTask_WhenTaskExists_ReturnsTaskDto() {
            // Given
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.getTask(TASK_ID);

            // Then
            assertNotNull(result);
            assertEquals(TASK_ID, result.id());
            verify(taskRepository).findById(TASK_ID);
            verify(taskMapper).toDto(task);
        }

        @Test
        void getTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(ResourceNotFoundException.class, () -> taskService.getTask(TASK_ID));
            verify(taskMapper, never()).toDto(any());
        }
    }

    @Nested
    class CreateTaskTests {
        private TaskRequest createTaskRequest;

        @BeforeEach
        void setUp() {
            createTaskRequest =
                    new TaskRequest(
                            BOARD_ID,
                            null,
                            "New Task",
                            "Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);
        }

        @Test
        void createTask_WhenValid_ReturnsCreatedTask() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(columnRepository.findById(COLUMN_ID)).thenReturn(Optional.of(column));
            when(taskRepository.findMaxPositionByBoardId(BOARD_ID)).thenReturn(-1);
            when(taskMapper.toEntity(any(), any(), any(), any(), any())).thenReturn(task);
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.createTask(createTaskRequest);

            // Then
            assertNotNull(result);
            verify(taskRepository).save(any(Task.class));
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void createTask_WhenNotAuthenticated_ThrowsUnauthorizedException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(null);

            // When & Then
            assertThrows(
                    UnauthorizedException.class, () -> taskService.createTask(createTaskRequest));
            verify(taskRepository, never()).save(any());
        }

        @Test
        void createTask_WhenUserNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.createTask(createTaskRequest));
        }

        @Test
        void createTask_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.createTask(createTaskRequest));
        }

        @Test
        void createTask_WhenColumnNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(columnRepository.findById(COLUMN_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.createTask(createTaskRequest));
        }

        @Test
        void createTask_WhenColumnDoesNotBelongToBoard_ThrowsBadRequestException() {
            // Given
            Board otherBoard = Board.builder().id(UUID.randomUUID()).name("Other Board").build();
            Column columnFromOtherBoard =
                    Column.builder()
                            .id(COLUMN_ID)
                            .name("Column")
                            .position(0)
                            .board(otherBoard)
                            .build();

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(columnRepository.findById(COLUMN_ID))
                    .thenReturn(Optional.of(columnFromOtherBoard));

            // When & Then
            assertThrows(
                    BadRequestException.class, () -> taskService.createTask(createTaskRequest));
        }

        @Test
        void createTask_WithAssigneeNotCollaborator_ThrowsBoardAccessException() {
            // Given
            TaskRequest requestWithAssignee =
                    new TaskRequest(
                            BOARD_ID,
                            "nonCollaboratorId",
                            "New Task",
                            "Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(columnRepository.findById(COLUMN_ID)).thenReturn(Optional.of(column));

            // When & Then
            assertThrows(
                    BoardAccessException.class, () -> taskService.createTask(requestWithAssignee));
        }

        @Test
        void createTask_WithValidAssignee_AssignsUser() {
            // Given
            BoardUser assigneeBoardUser =
                    BoardUser.builder().board(board).user(assignee).role(BoardRole.MEMBER).build();
            board.getCollaborators().add(assigneeBoardUser);

            TaskRequest requestWithAssignee =
                    new TaskRequest(
                            BOARD_ID,
                            ASSIGNEE_ID,
                            "New Task",
                            "Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(userRepository.findById(ASSIGNEE_ID)).thenReturn(Optional.of(assignee));
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(columnRepository.findById(COLUMN_ID)).thenReturn(Optional.of(column));
            when(taskRepository.findMaxPositionByBoardId(BOARD_ID)).thenReturn(-1);
            when(taskMapper.toEntity(any(), any(), any(), eq(assignee), any())).thenReturn(task);
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.createTask(requestWithAssignee);

            // Then
            assertNotNull(result);
            verify(userRepository).findById(ASSIGNEE_ID);
        }
    }

    @Nested
    class UpdateTaskTests {
        private TaskRequest updateTaskRequest;

        @BeforeEach
        void setUp() {
            updateTaskRequest =
                    new TaskRequest(
                            BOARD_ID,
                            null,
                            "Updated Task",
                            "Updated Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);
        }

        @Test
        void updateTask_WhenValid_ReturnsUpdatedTask() {
            // Given
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.updateTask(TASK_ID, updateTaskRequest);

            // Then
            assertNotNull(result);
            assertEquals("Updated Task", task.getTitle());
            assertEquals("Updated Description", task.getDescription());
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void updateTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.updateTask(TASK_ID, updateTaskRequest));
        }

        @Test
        void updateTask_WhenBoardMismatch_ThrowsBadRequestException() {
            // Given
            TaskRequest requestWithWrongBoard =
                    new TaskRequest(
                            UUID.randomUUID(), // Different board ID
                            null,
                            "Updated Task",
                            "Updated Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> taskService.updateTask(TASK_ID, requestWithWrongBoard));
        }

        @Test
        void updateTask_WhenColumnChanged_UpdatesColumn() {
            // Given
            TaskRequest requestWithNewColumn =
                    new TaskRequest(
                            BOARD_ID,
                            null,
                            "Updated Task",
                            "Updated Description",
                            NEW_COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(columnRepository.findById(NEW_COLUMN_ID)).thenReturn(Optional.of(newColumn));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            taskService.updateTask(TASK_ID, requestWithNewColumn);

            // Then
            assertEquals(newColumn, task.getColumn());
            verify(columnRepository).findById(NEW_COLUMN_ID);
        }

        @Test
        void updateTask_WhenNewColumnDoesNotBelongToBoard_ThrowsBadRequestException() {
            // Given
            Board otherBoard = Board.builder().id(UUID.randomUUID()).name("Other Board").build();
            Column columnFromOtherBoard =
                    Column.builder()
                            .id(NEW_COLUMN_ID)
                            .name("Other Column")
                            .position(0)
                            .board(otherBoard)
                            .build();

            TaskRequest requestWithNewColumn =
                    new TaskRequest(
                            BOARD_ID,
                            null,
                            "Updated Task",
                            "Updated Description",
                            NEW_COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(columnRepository.findById(NEW_COLUMN_ID))
                    .thenReturn(Optional.of(columnFromOtherBoard));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> taskService.updateTask(TASK_ID, requestWithNewColumn));
        }

        @Test
        void updateTask_WhenAssigneeChanged_UpdatesAssignee() {
            // Given
            BoardUser assigneeBoardUser =
                    BoardUser.builder().board(board).user(assignee).role(BoardRole.MEMBER).build();
            board.getCollaborators().add(assigneeBoardUser);

            TaskRequest requestWithAssignee =
                    new TaskRequest(
                            BOARD_ID,
                            ASSIGNEE_ID,
                            "Updated Task",
                            "Updated Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(userRepository.findById(ASSIGNEE_ID)).thenReturn(Optional.of(assignee));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            taskService.updateTask(TASK_ID, requestWithAssignee);

            // Then
            assertEquals(assignee, task.getAssignedTo());
        }

        @Test
        void updateTask_WhenAssigneeCleared_SetsAssigneeNull() {
            // Given
            task.setAssignedTo(assignee);
            TaskRequest requestClearAssignee =
                    new TaskRequest(
                            BOARD_ID,
                            null,
                            "Updated Task",
                            "Updated Description",
                            COLUMN_ID,
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            taskService.updateTask(TASK_ID, requestClearAssignee);

            // Then
            assertNull(task.getAssignedTo());
        }
    }

    @Nested
    class DeleteTaskTests {
        @Test
        void deleteTask_WhenTaskExists_DeletesTask() {
            // Given
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));

            // When
            taskService.deleteTask(TASK_ID);

            // Then
            verify(taskRepository).delete(task);
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void deleteTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(ResourceNotFoundException.class, () -> taskService.deleteTask(TASK_ID));
            verify(taskRepository, never()).delete(any());
        }
    }

    @Nested
    class MoveTaskTests {
        @BeforeEach
        void setUp() {
            task.setPosition(1);
            task.setColumn(column);
        }

        @Test
        void moveTask_SamePosition_NoChange() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(1, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));

            // When
            taskService.moveTask(TASK_ID, request);

            // Then
            verify(taskRepository, never()).decrementPositionsInRange(any(), any(), any());
            verify(taskRepository, never()).incrementPositionsInRange(any(), any(), any());
            verify(boardRepository, never()).save(any());
        }

        @Test
        void moveTask_DownInSameColumn_ShiftsPositions() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(3, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));

            // When
            taskService.moveTask(TASK_ID, request);

            // Then
            assertEquals(3, task.getPosition());
            verify(taskRepository).decrementPositionsInRange(COLUMN_ID, 1, 3);
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void moveTask_UpInSameColumn_ShiftsPositions() {
            // Given
            task.setPosition(3);
            MoveTaskRequest request = new MoveTaskRequest(1, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));

            // When
            taskService.moveTask(TASK_ID, request);

            // Then
            assertEquals(1, task.getPosition());
            verify(taskRepository).incrementPositionsInRange(COLUMN_ID, 1, 3);
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
        }

        @Test
        void moveTask_ToDifferentColumn_ShiftsPositionsInBothColumns() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(0, NEW_COLUMN_ID);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(columnRepository.findById(NEW_COLUMN_ID)).thenReturn(Optional.of(newColumn));

            // When
            taskService.moveTask(TASK_ID, request);

            // Then
            assertEquals(newColumn, task.getColumn());
            assertEquals(0, task.getPosition());
            verify(taskRepository).decrementPositionsAfter(COLUMN_ID, 1);
            verify(taskRepository).incrementPositionsFrom(NEW_COLUMN_ID, 0);
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
        }

        @Test
        void moveTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(0, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class, () -> taskService.moveTask(TASK_ID, request));
        }

        @Test
        void moveTask_WhenNewColumnNotFound_ThrowsResourceNotFoundException() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(0, NEW_COLUMN_ID);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(columnRepository.findById(NEW_COLUMN_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class, () -> taskService.moveTask(TASK_ID, request));
        }

        @Test
        void moveTask_WhenNewColumnDoesNotBelongToBoard_ThrowsBadRequestException() {
            // Given
            Board otherBoard = Board.builder().id(UUID.randomUUID()).name("Other Board").build();
            Column columnFromOtherBoard =
                    Column.builder()
                            .id(NEW_COLUMN_ID)
                            .name("Other Column")
                            .position(0)
                            .board(otherBoard)
                            .build();

            MoveTaskRequest request = new MoveTaskRequest(0, NEW_COLUMN_ID);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(columnRepository.findById(NEW_COLUMN_ID))
                    .thenReturn(Optional.of(columnFromOtherBoard));

            // When & Then
            assertThrows(BadRequestException.class, () -> taskService.moveTask(TASK_ID, request));
        }
    }
}
