package com.kylerriggs.kanban.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import com.kylerriggs.kanban.activity.ActivityLog;
import com.kylerriggs.kanban.activity.ActivityLogRepository;
import com.kylerriggs.kanban.activity.ActivityType;
import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardRole;
import com.kylerriggs.kanban.board.BoardUser;
import com.kylerriggs.kanban.board.BoardUserRepository;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.label.Label;
import com.kylerriggs.kanban.label.LabelRepository;
import com.kylerriggs.kanban.support.PostgresIntegrationTestBase;
import com.kylerriggs.kanban.task.dto.MoveTaskRequest;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.task.dto.TaskStatusRequest;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;
import com.kylerriggs.kanban.websocket.dto.BoardEventType;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class TaskServiceIT extends PostgresIntegrationTestBase {

    @Autowired private TaskService taskService;
    @Autowired private TaskRepository taskRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardUserRepository boardUserRepository;
    @Autowired private ColumnRepository columnRepository;
    @Autowired private LabelRepository labelRepository;
    @Autowired private ActivityLogRepository activityLogRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private BoardEventPublisher boardEventPublisher;

    private User owner;
    private User collaborator;
    private Board board;
    private Column todoColumn;
    private Label bugLabel;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        owner =
                userRepository.save(
                        User.builder()
                                .id("auth0|task-owner")
                                .username("task-owner")
                                .email("task-owner@example.com")
                                .profileImageUrl("https://example.com/task-owner.png")
                                .build());
        collaborator =
                userRepository.save(
                        User.builder()
                                .id("auth0|task-collab")
                                .username("task-collab")
                                .email("task-collab@example.com")
                                .profileImageUrl("https://example.com/task-collab.png")
                                .build());

        board =
                boardRepository.save(
                        Board.builder()
                                .name("Task Service IT")
                                .description("board")
                                .createdBy(owner)
                                .build());
        boardUserRepository.save(
                BoardUser.builder().board(board).user(owner).role(BoardRole.ADMIN).build());
        boardUserRepository.save(
                BoardUser.builder().board(board).user(collaborator).role(BoardRole.MEMBER).build());

        todoColumn =
                columnRepository.save(
                        Column.builder()
                                .name("To Do")
                                .position(0)
                                .board(board)
                                .isArchived(false)
                                .build());
        columnRepository.save(
                Column.builder().name("Done").position(1).board(board).isArchived(false).build());

        bugLabel =
                labelRepository.save(
                        Label.builder().name("bug").color("#ff0000").board(board).build());
    }

    @Test
    void createTask_persistsTaskAndWritesTaskCreatedActivity() {
        withAuthenticatedUser(owner.getId());

        TaskDto created =
                taskService.createTask(
                        new TaskRequest(
                                board.getId(),
                                null,
                                "Integration Task",
                                "created from IT",
                                todoColumn.getId(),
                                false,
                                false,
                                "HIGH",
                                null,
                                List.of(bugLabel.getId())));

        entityManager.flush();
        entityManager.clear();

        Task persisted =
                taskRepository
                        .findById(created.id())
                        .orElseThrow(() -> new AssertionError("Expected task to be persisted"));
        List<ActivityLog> logs = activityLogRepository.findAll();

        assertThat(persisted.getTitle()).isEqualTo("Integration Task");
        assertThat(persisted.getAssignedTo()).isNull();
        assertThat(persisted.getLabels())
                .extracting(Label::getId)
                .containsExactly(bugLabel.getId());
        assertThat(logs).extracting(ActivityLog::getType).contains(ActivityType.TASK_CREATED);
        verify(boardEventPublisher)
                .publish(BoardEventType.TASK_CREATED, board.getId(), persisted.getId());
    }

    @Test
    void updateTaskStatus_archivesTaskAndCreatesArchiveActivity() {
        UUID taskId = seedTask(todoColumn, false, 1_000_000L);
        withAuthenticatedUser(owner.getId());

        taskService.updateTaskStatus(taskId, new TaskStatusRequest(null, true));

        entityManager.flush();
        entityManager.clear();

        Task archived =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(() -> new AssertionError("Expected task to exist"));
        assertThat(archived.isArchived()).isTrue();
        assertThat(archived.getRestorePosition()).isEqualTo(1_000_000L);
        assertThat(activityLogRepository.findAll())
                .extracting(ActivityLog::getType)
                .contains(ActivityType.TASK_ARCHIVED);
    }

    @Test
    void moveTask_reordersTaskBetweenNeighbors() {
        UUID firstTaskId = seedTask(todoColumn, false, 1_000_000L);
        UUID secondTaskId = seedTask(todoColumn, false, 2_000_000L);
        UUID movingTaskId = seedTask(todoColumn, false, 3_000_000L);
        withAuthenticatedUser(owner.getId());

        taskService.moveTask(movingTaskId, new MoveTaskRequest(firstTaskId, secondTaskId, null));

        entityManager.flush();
        entityManager.clear();

        Task moved =
                taskRepository
                        .findById(movingTaskId)
                        .orElseThrow(() -> new AssertionError("Expected moved task"));
        assertThat(moved.getColumn().getId()).isEqualTo(todoColumn.getId());
        assertThat(moved.getPosition()).isBetween(1_000_000L, 2_000_000L);
        verify(boardEventPublisher).publish(BoardEventType.TASK_MOVED, board.getId(), movingTaskId);
    }

    @Test
    void createTask_rejectsArchivedBoard() {
        board.setArchived(true);
        boardRepository.save(board);
        withAuthenticatedUser(owner.getId());

        assertThatThrownBy(
                        () ->
                                taskService.createTask(
                                        new TaskRequest(
                                                board.getId(),
                                                null,
                                                "Cannot create",
                                                "archived board",
                                                todoColumn.getId(),
                                                false,
                                                false,
                                                null,
                                                null,
                                                List.of())))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Board is archived");
    }

    private UUID seedTask(Column column, boolean archived, long position) {
        Task task =
                taskRepository.save(
                        Task.builder()
                                .title("Seed task " + position)
                                .description("seed")
                                .position(position)
                                .board(board)
                                .column(column)
                                .createdBy(owner)
                                .isArchived(archived)
                                .build());
        return task.getId();
    }

    private void withAuthenticatedUser(String userId) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new org.springframework.security.authentication
                                .UsernamePasswordAuthenticationToken(userId, "n/a", List.of()));
    }
}
