package com.kylerriggs.kanban.task;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.kanban.activity.ActivityLogService;
import com.kylerriggs.kanban.activity.ActivityType;
import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardRole;
import com.kylerriggs.kanban.board.BoardUser;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardAccessException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.dto.MoveTaskRequest;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.task.dto.TaskStatusRequest;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserLookupService;
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
import java.util.Objects;
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
    private static final UUID AFTER_TASK_ID =
            UUID.fromString("e556c2d0-891b-44de-816b-c9259cd00395");
    private static final UUID BEFORE_TASK_ID =
            UUID.fromString("f656c2d0-891b-44de-816b-c9259cd00396");

    @Mock private TaskRepository taskRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private TaskMapper taskMapper;
    @Mock private UserLookupService userLookupService;
    @Mock private TaskValidationService taskValidationService;
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
                        .position(1_000_000L)
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
                        1_000_000L,
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
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.getTask(Objects.requireNonNull(TASK_ID));

            // Then
            assertNotNull(result);
            assertEquals(TASK_ID, result.id());
            verify(taskRepository).findById(Objects.requireNonNull(TASK_ID));
            verify(taskMapper).toDto(task);
        }

        @Test
        void getTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.getTask(Objects.requireNonNull(TASK_ID)));
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
                            Objects.requireNonNull(BOARD_ID),
                            null,
                            "New Task",
                            "Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);
        }

        @Test
        void createTask_WhenValid_ReturnsCreatedTask() {
            // Given
            when(userLookupService.getRequiredCurrentUser()).thenReturn(user);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(taskValidationService.validateColumnInBoard(COLUMN_ID, BOARD_ID))
                    .thenReturn(column);
            when(taskRepository.findMaxPositionByColumnId(Objects.requireNonNull(COLUMN_ID)))
                    .thenReturn(Optional.empty());
            when(taskMapper.toEntity(any(), any(), any(), any(), any())).thenReturn(task);
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.createTask(Objects.requireNonNull(createTaskRequest));

            // Then
            assertNotNull(result);
            verify(taskRepository).save(any(Task.class));
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void createTask_WhenNotAuthenticated_ThrowsUnauthorizedException() {
            // Given
            when(userLookupService.getRequiredCurrentUser())
                    .thenThrow(new UnauthorizedException("User not authenticated"));

            // When & Then
            assertThrows(
                    UnauthorizedException.class,
                    () -> taskService.createTask(Objects.requireNonNull(createTaskRequest)));
            verify(taskRepository, never()).save(any());
        }

        @Test
        void createTask_WhenUserNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userLookupService.getRequiredCurrentUser())
                    .thenThrow(new ResourceNotFoundException("User not found: " + USER_ID));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.createTask(Objects.requireNonNull(createTaskRequest)));
        }

        @Test
        void createTask_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userLookupService.getRequiredCurrentUser()).thenReturn(user);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.createTask(Objects.requireNonNull(createTaskRequest)));
        }

        @Test
        void createTask_WhenColumnNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userLookupService.getRequiredCurrentUser()).thenReturn(user);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(taskValidationService.validateColumnInBoard(COLUMN_ID, BOARD_ID))
                    .thenThrow(new ResourceNotFoundException("Column not found: " + COLUMN_ID));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.createTask(Objects.requireNonNull(createTaskRequest)));
        }

        @Test
        void createTask_WhenColumnDoesNotBelongToBoard_ThrowsBadRequestException() {
            // Given
            when(userLookupService.getRequiredCurrentUser()).thenReturn(user);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(taskValidationService.validateColumnInBoard(COLUMN_ID, BOARD_ID))
                    .thenThrow(new BadRequestException("Column does not belong to this board"));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> taskService.createTask(Objects.requireNonNull(createTaskRequest)));
        }

        @Test
        void createTask_WithAssigneeNotCollaborator_ThrowsBoardAccessException() {
            // Given
            TaskRequest requestWithAssignee =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            "nonCollaboratorId",
                            "New Task",
                            "Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            when(userLookupService.getRequiredCurrentUser()).thenReturn(user);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(taskValidationService.validateColumnInBoard(COLUMN_ID, BOARD_ID))
                    .thenReturn(column);
            when(taskValidationService.validateAssigneeInBoard("nonCollaboratorId", board))
                    .thenThrow(
                            new BoardAccessException(
                                    "User is not a collaborator on the board: nonCollaboratorId"));

            // When & Then
            assertThrows(
                    BoardAccessException.class, () -> taskService.createTask(requestWithAssignee));
        }

        @Test
        void createTask_WithValidAssignee_AssignsUser() {
            // Given
            TaskRequest requestWithAssignee =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            Objects.requireNonNull(ASSIGNEE_ID),
                            "New Task",
                            "Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            when(userLookupService.getRequiredCurrentUser()).thenReturn(user);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(taskValidationService.validateColumnInBoard(COLUMN_ID, BOARD_ID))
                    .thenReturn(column);
            when(taskValidationService.validateAssigneeInBoard(ASSIGNEE_ID, board))
                    .thenReturn(assignee);
            when(taskRepository.findMaxPositionByColumnId(Objects.requireNonNull(COLUMN_ID)))
                    .thenReturn(Optional.empty());
            when(taskMapper.toEntity(any(), any(), any(), eq(assignee), any())).thenReturn(task);
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result = taskService.createTask(requestWithAssignee);

            // Then
            assertNotNull(result);
            verify(taskValidationService).validateAssigneeInBoard(ASSIGNEE_ID, board);
        }
    }

    @Nested
    class UpdateTaskTests {
        private TaskRequest updateTaskRequest;

        @BeforeEach
        void setUp() {
            updateTaskRequest =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            null,
                            "Updated Task",
                            "Updated Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);
        }

        @Test
        void updateTask_WhenValid_ReturnsUpdatedTask() {
            // Given
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            TaskDto result =
                    taskService.updateTask(Objects.requireNonNull(TASK_ID), updateTaskRequest);

            // Then
            assertNotNull(result);
            assertEquals("Updated Task", task.getTitle());
            assertEquals("Updated Description", task.getDescription());
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void updateTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            taskService.updateTask(
                                    Objects.requireNonNull(TASK_ID), updateTaskRequest));
        }

        @Test
        void updateTask_WhenBoardMismatch_ThrowsBadRequestException() {
            // Given
            TaskRequest requestWithWrongBoard =
                    new TaskRequest(
                            Objects.requireNonNull(UUID.randomUUID()), // Different board ID
                            null,
                            "Updated Task",
                            "Updated Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            taskService.updateTask(
                                    Objects.requireNonNull(TASK_ID), requestWithWrongBoard));
        }

        @Test
        void updateTask_WhenColumnChanged_UpdatesColumn() {
            // Given
            TaskRequest requestWithNewColumn =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            null,
                            "Updated Task",
                            "Updated Description",
                            Objects.requireNonNull(NEW_COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID))
                    .thenReturn(newColumn);
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            taskService.updateTask(Objects.requireNonNull(TASK_ID), requestWithNewColumn);

            // Then
            assertEquals(newColumn, task.getColumn());
            verify(taskValidationService).validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID);
        }

        @Test
        void updateTask_WhenNewColumnDoesNotBelongToBoard_ThrowsBadRequestException() {
            // Given
            TaskRequest requestWithNewColumn =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            null,
                            "Updated Task",
                            "Updated Description",
                            Objects.requireNonNull(NEW_COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID))
                    .thenThrow(new BadRequestException("Column does not belong to this board"));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            taskService.updateTask(
                                    Objects.requireNonNull(TASK_ID), requestWithNewColumn));
        }

        @Test
        void updateTask_WhenAssigneeChanged_UpdatesAssignee() {
            // Given
            TaskRequest requestWithAssignee =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            Objects.requireNonNull(ASSIGNEE_ID),
                            "Updated Task",
                            "Updated Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateAssigneeInBoard(ASSIGNEE_ID, board))
                    .thenReturn(assignee);
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            taskService.updateTask(Objects.requireNonNull(TASK_ID), requestWithAssignee);

            // Then
            assertEquals(assignee, task.getAssignedTo());
        }

        @Test
        void updateTask_WhenAssigneeCleared_SetsAssigneeNull() {
            // Given
            task.setAssignedTo(assignee);
            TaskRequest requestClearAssignee =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            null,
                            "Updated Task",
                            "Updated Description",
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            // When
            taskService.updateTask(Objects.requireNonNull(TASK_ID), requestClearAssignee);
            // Then
            assertNull(task.getAssignedTo());
        }
    }

    @Nested
    class DeleteTaskTests {
        @Test
        void deleteTask_WhenTaskExists_DeletesTask() {
            // Given
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));

            // When
            taskService.deleteTask(Objects.requireNonNull(TASK_ID));

            // Then
            verify(taskRepository).delete(Objects.requireNonNull(task));
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void deleteTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(taskRepository.findById(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.deleteTask(Objects.requireNonNull(TASK_ID)));
            verify(taskRepository, never()).delete(any());
        }
    }

    @Nested
    class MoveTaskTests {
        @BeforeEach
        void setUp() {
            task.setPosition(1_000_000L);
            task.setColumn(column);
        }

        @Test
        void moveTask_NoNeighbors_PlacesAtEndOfColumn() {
            // Given — no afterTaskId or beforeTaskId, same column
            MoveTaskRequest request = new MoveTaskRequest(null, null, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(taskRepository.findMaxPositionByColumnId(COLUMN_ID))
                    .thenReturn(Optional.of(1_000_000L));

            // When
            taskService.moveTask(Objects.requireNonNull(TASK_ID), request);

            // Then — position = maxPos + GAP = 2_000_000
            assertEquals(2_000_000L, task.getPosition());
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void moveTask_AfterNeighborOnly_PlacesAfterIt() {
            // Given — place after a task at position 2_000_000
            MoveTaskRequest request = new MoveTaskRequest(AFTER_TASK_ID, null, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(taskRepository.findPositionById(AFTER_TASK_ID))
                    .thenReturn(Optional.of(2_000_000L));

            // When
            taskService.moveTask(Objects.requireNonNull(TASK_ID), request);

            // Then — position = afterPos + GAP = 3_000_000
            assertEquals(3_000_000L, task.getPosition());
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
        }

        @Test
        void moveTask_BeforeNeighborOnly_PlacesBeforeIt() {
            // Given — task starts at 3_000_000, place before a task at position 2_000_000
            task.setPosition(3_000_000L);
            MoveTaskRequest request = new MoveTaskRequest(null, BEFORE_TASK_ID, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(taskRepository.findPositionById(BEFORE_TASK_ID))
                    .thenReturn(Optional.of(2_000_000L));

            // When
            taskService.moveTask(Objects.requireNonNull(TASK_ID), request);

            // Then — position = beforePos / 2 = 1_000_000
            assertEquals(1_000_000L, task.getPosition());
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
        }

        @Test
        void moveTask_BetweenTwoNeighbors_PlacesAtMidpoint() {
            // Given — place between tasks at 1_000_000 and 3_000_000
            MoveTaskRequest request = new MoveTaskRequest(AFTER_TASK_ID, BEFORE_TASK_ID, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(taskRepository.findPositionById(AFTER_TASK_ID))
                    .thenReturn(Optional.of(1_000_000L));
            when(taskRepository.findPositionById(BEFORE_TASK_ID))
                    .thenReturn(Optional.of(3_000_000L));

            // When
            taskService.moveTask(Objects.requireNonNull(TASK_ID), request);

            // Then — midpoint = 1_000_000 + (3_000_000 - 1_000_000) / 2 = 2_000_000
            assertEquals(2_000_000L, task.getPosition());
        }

        @Test
        void moveTask_ToDifferentColumn_ChangesColumnAndComputesPosition() {
            // Given — move to a different column, after a neighbor
            MoveTaskRequest request = new MoveTaskRequest(AFTER_TASK_ID, null, NEW_COLUMN_ID);
            when(taskRepository.findByIdWithLock(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID))
                    .thenReturn(newColumn);
            when(taskRepository.findPositionById(AFTER_TASK_ID))
                    .thenReturn(Optional.of(1_000_000L));

            // When
            taskService.moveTask(Objects.requireNonNull(TASK_ID), request);

            // Then
            assertEquals(newColumn, task.getColumn());
            assertEquals(2_000_000L, task.getPosition());
            verify(boardRepository)
                    .touchDateModified(eq(Objects.requireNonNull(BOARD_ID)), any(Instant.class));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
        }

        @Test
        void moveTask_ToDifferentColumnEmptyNoNeighbors_PlacesAtGap() {
            // Given — move to an empty column with no neighbors specified
            MoveTaskRequest request = new MoveTaskRequest(null, null, NEW_COLUMN_ID);
            when(taskRepository.findByIdWithLock(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID))
                    .thenReturn(newColumn);
            when(taskRepository.findMaxPositionByColumnId(NEW_COLUMN_ID))
                    .thenReturn(Optional.empty());

            // When
            taskService.moveTask(Objects.requireNonNull(TASK_ID), request);

            // Then — empty column: maxPos defaults to 0 + GAP = 1_000_000
            assertEquals(newColumn, task.getColumn());
            assertEquals(1_000_000L, task.getPosition());
        }

        @Test
        void moveTask_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(null, null, null);
            when(taskRepository.findByIdWithLock(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.moveTask(Objects.requireNonNull(TASK_ID), request));
        }

        @Test
        void moveTask_WhenNewColumnNotFound_ThrowsResourceNotFoundException() {
            // Given
            MoveTaskRequest request =
                    new MoveTaskRequest(null, null, Objects.requireNonNull(NEW_COLUMN_ID));
            when(taskRepository.findByIdWithLock(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID))
                    .thenThrow(new ResourceNotFoundException("Column not found: " + NEW_COLUMN_ID));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.moveTask(Objects.requireNonNull(TASK_ID), request));
        }

        @Test
        void moveTask_WhenNewColumnDoesNotBelongToBoard_ThrowsBadRequestException() {
            // Given
            MoveTaskRequest request =
                    new MoveTaskRequest(null, null, Objects.requireNonNull(NEW_COLUMN_ID));
            when(taskRepository.findByIdWithLock(Objects.requireNonNull(TASK_ID)))
                    .thenReturn(Optional.of(task));
            when(taskValidationService.validateColumnInBoard(NEW_COLUMN_ID, BOARD_ID))
                    .thenThrow(new BadRequestException("Column does not belong to this board"));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> taskService.moveTask(Objects.requireNonNull(TASK_ID), request));
        }

        @Test
        void moveTask_WhenAfterTaskNotFound_ThrowsResourceNotFoundException() {
            // Given
            MoveTaskRequest request = new MoveTaskRequest(AFTER_TASK_ID, null, null);
            when(taskRepository.findByIdWithLock(TASK_ID)).thenReturn(Optional.of(task));
            when(taskRepository.findPositionById(AFTER_TASK_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.moveTask(Objects.requireNonNull(TASK_ID), request));
        }
    }

    @Nested
    class UpdateTaskStatusTests {
        @Test
        void updateTaskStatus_WhenNoFieldsProvided_ThrowsBadRequestException() {
            assertThrows(
                    BadRequestException.class,
                    () -> taskService.updateTaskStatus(TASK_ID, new TaskStatusRequest(null, null)));
        }

        @Test
        void updateTaskStatus_WhenTaskNotFound_ThrowsResourceNotFoundException() {
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.empty());

            assertThrows(
                    ResourceNotFoundException.class,
                    () -> taskService.updateTaskStatus(TASK_ID, new TaskStatusRequest(true, null)));
        }

        @Test
        void updateTaskStatus_WhenCompletedChanged_UpdatesTaskAndLogsActivity() {
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            TaskDto result =
                    taskService.updateTaskStatus(TASK_ID, new TaskStatusRequest(true, null));

            assertNotNull(result);
            assertTrue(task.isCompleted());
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any(Instant.class));
            verify(eventPublisher).publish("TASK_UPDATED", BOARD_ID, TASK_ID);
            verify(activityLogService).logActivity(task, ActivityType.TASK_COMPLETED, null);
        }

        @Test
        void updateTaskStatus_WhenArchivedChanged_UpdatesTaskAndLogsActivity() {
            when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
            when(taskMapper.toDto(task)).thenReturn(taskDto);

            taskService.updateTaskStatus(TASK_ID, new TaskStatusRequest(null, true));

            assertTrue(task.isArchived());
            verify(activityLogService).logActivity(task, ActivityType.TASK_ARCHIVED, null);
        }
    }
}
