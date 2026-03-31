package com.kylerriggs.kanban.task;

import static org.assertj.core.api.Assertions.assertThat;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.support.PostgresIntegrationTestBase;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class TaskRepositoryIT extends PostgresIntegrationTestBase {

    @Autowired private TaskRepository taskRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private ColumnRepository columnRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;

    private User owner;
    private Board board;
    private Column column;

    private UUID activeTaskAId;
    private UUID activeTaskBId;
    private UUID archivedTaskId;

    @BeforeEach
    void setUp() {
        owner =
                userRepository.save(
                        User.builder()
                                .id("auth0|task-repo-owner")
                                .username("task-repo-owner")
                                .email("task-repo-owner@example.com")
                                .profileImageUrl("https://example.com/task-repo-owner.png")
                                .build());

        board =
                boardRepository.save(
                        Board.builder()
                                .name("Task Repository IT Board")
                                .description("repository edge cases")
                                .createdBy(owner)
                                .build());

        column =
                columnRepository.save(
                        Column.builder()
                                .name("To Do")
                                .position(0)
                                .board(board)
                                .isArchived(false)
                                .build());

        activeTaskAId = seedTask("Task A", 1_000_000L, false).getId();
        activeTaskBId = seedTask("Task B", 2_000_000L, false).getId();
        archivedTaskId = seedTask("Task Archived", 3_000_000L, true).getId();
    }

    @Test
    void findActivePositionByIdAndColumnId_returnsOnlyForActiveTasks() {
        assertThat(taskRepository.findActivePositionByIdAndColumnId(activeTaskAId, column.getId()))
                .contains(1_000_000L);
        assertThat(taskRepository.findActivePositionByIdAndColumnId(archivedTaskId, column.getId()))
                .isEmpty();
    }

    @Test
    void findMaxPositionByColumnIdAndIsArchivedFalse_ignoresArchivedTasks() {
        assertThat(taskRepository.findMaxPositionByColumnIdAndIsArchivedFalse(column.getId()))
                .contains(2_000_000L);
    }

    @Test
    void findByColumnIdAndIsArchivedFalseOrderByPosition_returnsOrderedActiveTasksOnly() {
        List<Task> activeTasks =
                taskRepository.findByColumnIdAndIsArchivedFalseOrderByPosition(column.getId());

        assertThat(activeTasks)
                .extracting(Task::getId)
                .containsExactly(activeTaskAId, activeTaskBId);
        assertThat(activeTasks).allMatch(task -> !task.isArchived());
    }

    @Test
    void updatePosition_updatesPersistedPositionWithoutChangingArchiveState() {
        taskRepository.updatePosition(activeTaskBId, 1_500_000L);
        entityManager.flush();
        entityManager.clear();

        Task updatedTask =
                taskRepository
                        .findById(activeTaskBId)
                        .orElseThrow(() -> new AssertionError("Expected task"));
        Task archivedTask =
                taskRepository
                        .findById(archivedTaskId)
                        .orElseThrow(() -> new AssertionError("Expected archived task"));

        assertThat(updatedTask.getPosition()).isEqualTo(1_500_000L);
        assertThat(updatedTask.isArchived()).isFalse();
        assertThat(archivedTask.isArchived()).isTrue();
        assertThat(archivedTask.getPosition()).isEqualTo(3_000_000L);
    }

    private Task seedTask(String title, long position, boolean archived) {
        return taskRepository.save(
                Task.builder()
                        .title(title)
                        .description("seed")
                        .position(position)
                        .board(board)
                        .column(column)
                        .createdBy(owner)
                        .isArchived(archived)
                        .build());
    }
}
