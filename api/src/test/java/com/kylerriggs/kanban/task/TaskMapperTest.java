package com.kylerriggs.kanban.task;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.label.LabelMapper;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserMapper;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class TaskMapperTest {

    private static final UUID TASK_ID = UUID.randomUUID();
    private static final UUID BOARD_ID = UUID.randomUUID();
    private static final UUID COLUMN_ID = UUID.randomUUID();
    private static final String CREATOR_ID = "auth0|creator123";
    private static final String ASSIGNEE_ID = "auth0|assignee456";
    private static final String TASK_TITLE = "Test Task";
    private static final String TASK_DESCRIPTION = "Test Description";

    @Mock private UserMapper userMapper;
    @Mock private LabelMapper labelMapper;

    private TaskMapper taskMapper;

    @BeforeEach
    void setUp() {
        taskMapper = new TaskMapper(userMapper, labelMapper);
    }

    private User createUser(String id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setProfileImageUrl("https://example.com/" + username + ".jpg");
        return user;
    }

    private Task createTask(User creator, User assignee) {
        Board board = new Board();
        board.setId(BOARD_ID);

        Column column = new Column();
        column.setId(COLUMN_ID);
        column.setBoard(board);

        Task task = new Task();
        task.setId(TASK_ID);
        task.setTitle(TASK_TITLE);
        task.setDescription(TASK_DESCRIPTION);
        task.setBoard(board);
        task.setColumn(column);
        task.setCreatedBy(creator);
        task.setAssignedTo(assignee);
        task.setPosition(0L);
        task.setCompleted(false);
        task.setArchived(false);
        task.setDateCreated(Instant.now());
        task.setDateModified(Instant.now());

        return task;
    }

    @Nested
    class ToDto {

        @Test
        void toDto_WithAssignee_ShouldMapAllFields() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            User assignee = createUser(ASSIGNEE_ID, "assignee");
            Task task = createTask(creator, assignee);

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);

            // When
            TaskDto result = taskMapper.toDto(task);

            // Then
            assertEquals(TASK_ID, result.id());
            assertEquals(creatorSummary, result.createdBy());
            assertNotNull(result.assignedTo());
            assertEquals(ASSIGNEE_ID, result.assignedTo().id());
            assertEquals(TASK_TITLE, result.title());
            assertEquals(TASK_DESCRIPTION, result.description());
            assertEquals(COLUMN_ID, result.columnId());
            assertEquals(0, result.position());
            assertFalse(result.isCompleted());
            assertFalse(result.isArchived());
            assertNotNull(result.dateCreated());
            assertNotNull(result.dateModified());
        }

        @Test
        void toDto_WithoutAssignee_ShouldHaveNullAssignee() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Task task = createTask(creator, null);

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);

            // When
            TaskDto result = taskMapper.toDto(task);

            // Then
            assertNull(result.assignedTo());
        }

        @Test
        void toDto_WhenCompletedAndArchived_ShouldReflectStatus() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Task task = createTask(creator, null);
            task.setCompleted(true);
            task.setArchived(true);

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);

            // When
            TaskDto result = taskMapper.toDto(task);

            // Then
            assertTrue(result.isCompleted());
            assertTrue(result.isArchived());
        }
    }

    @Nested
    class ToSummaryDto {

        @Test
        void toSummaryDto_WithAssignee_ShouldMapCorrectly() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            User assignee = createUser(ASSIGNEE_ID, "assignee");
            Task task = createTask(creator, assignee);

            UserSummaryDto assigneeSummary =
                    new UserSummaryDto(ASSIGNEE_ID, "assignee", "https://example.com/assignee.jpg");
            when(userMapper.toSummaryDto(assignee)).thenReturn(assigneeSummary);

            // When
            TaskSummaryDto result = taskMapper.toSummaryDto(task);

            // Then
            assertEquals(TASK_ID, result.id());
            assertEquals(TASK_TITLE, result.title());
            assertEquals(COLUMN_ID, result.columnId());
            assertEquals(assigneeSummary, result.assignedTo());
            assertEquals(0, result.position());
            assertFalse(result.isCompleted());
            assertFalse(result.isArchived());
            assertEquals(0L, result.commentCount());
            assertTrue(result.hasDescription());
        }

        @Test
        void toSummaryDto_WithoutAssignee_ShouldHaveNullAssignee() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Task task = createTask(creator, null);
            task.setDescription(" ");

            // When
            TaskSummaryDto result = taskMapper.toSummaryDto(task);

            // Then
            assertNull(result.assignedTo());
            assertEquals(0L, result.commentCount());
            assertFalse(result.hasDescription());
            verify(userMapper, never()).toSummaryDto(any());
        }
    }

    @Nested
    class ToEntity {

        @Test
        void toEntity_WithAssignee_ShouldCreateTaskWithAssignee() {
            // Given
            TaskRequest request =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            ASSIGNEE_ID,
                            TASK_TITLE,
                            TASK_DESCRIPTION,
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            Board board = new Board();
            board.setId(BOARD_ID);

            Column column = new Column();
            column.setId(COLUMN_ID);

            User creator = createUser(CREATOR_ID, "creator");
            User assignee = createUser(ASSIGNEE_ID, "assignee");

            // When
            Task result = taskMapper.toEntity(request, board, creator, assignee, column);

            // Then
            assertEquals(board, result.getBoard());
            assertEquals(creator, result.getCreatedBy());
            assertEquals(TASK_TITLE, result.getTitle());
            assertEquals(TASK_DESCRIPTION, result.getDescription());
            assertEquals(column, result.getColumn());
            assertEquals(assignee, result.getAssignedTo());
        }

        @Test
        void toEntity_WithoutAssignee_ShouldCreateTaskWithNullAssignee() {
            // Given
            TaskRequest request =
                    new TaskRequest(
                            Objects.requireNonNull(BOARD_ID),
                            null,
                            TASK_TITLE,
                            TASK_DESCRIPTION,
                            Objects.requireNonNull(COLUMN_ID),
                            false,
                            false,
                            null,
                            null,
                            null);

            Board board = new Board();
            board.setId(BOARD_ID);

            Column column = new Column();
            column.setId(COLUMN_ID);

            User creator = createUser(CREATOR_ID, "creator");

            // When
            Task result = taskMapper.toEntity(request, board, creator, null, column);

            // Then
            assertNull(result.getAssignedTo());
        }
    }
}
