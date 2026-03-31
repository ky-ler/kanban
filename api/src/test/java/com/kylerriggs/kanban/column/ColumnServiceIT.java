package com.kylerriggs.kanban.column;

import static org.assertj.core.api.Assertions.assertThat;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.column.dto.ColumnArchiveRequest;
import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.support.PostgresIntegrationTestBase;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@SpringBootTest
@Transactional
class ColumnServiceIT extends PostgresIntegrationTestBase {

    @Autowired private ColumnService columnService;
    @Autowired private UserRepository userRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private ColumnRepository columnRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private BoardEventPublisher boardEventPublisher;

    private UUID boardId;
    private UUID targetColumnId;
    private UUID otherColumnId;
    private UUID taskId;

    @BeforeEach
    void setUp() {
        User user =
                userRepository.save(
                        User.builder()
                                .id("auth0|column-service-it")
                                .username("column-service-it")
                                .email("column-service-it@example.com")
                                .profileImageUrl("https://example.com/avatar.png")
                                .build());

        Board board =
                boardRepository.save(
                        Board.builder().name("Column Service IT Board").createdBy(user).build());
        boardId = board.getId();

        Column targetColumn =
                columnRepository.save(
                        Column.builder()
                                .name("To Do")
                                .position(0)
                                .board(board)
                                .isArchived(false)
                                .build());
        targetColumnId = targetColumn.getId();

        Column otherColumn =
                columnRepository.save(
                        Column.builder()
                                .name("In Progress")
                                .position(1)
                                .board(board)
                                .isArchived(false)
                                .build());
        otherColumnId = otherColumn.getId();

        Task task =
                taskRepository.save(
                        Task.builder()
                                .title("Archive this task")
                                .description("Integration test task")
                                .position(1_000_000L)
                                .board(board)
                                .column(targetColumn)
                                .createdBy(user)
                                .build());
        taskId = task.getId();
    }

    @Test
    void updateColumnArchive_withConfirm_archivesColumnAndTasks() {
        ColumnDto result =
                columnService.updateColumnArchive(
                        boardId, targetColumnId, new ColumnArchiveRequest(true, true));
        entityManager.flush();
        entityManager.clear();

        Column archivedColumn =
                columnRepository
                        .findById(targetColumnId)
                        .orElseThrow(() -> new AssertionError("Expected archived column"));
        Column shiftedColumn =
                columnRepository
                        .findById(otherColumnId)
                        .orElseThrow(() -> new AssertionError("Expected active sibling column"));
        Task archivedTask =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(() -> new AssertionError("Expected task to exist"));

        assertThat(result.isArchived()).isTrue();
        assertThat(archivedColumn.isArchived()).isTrue();
        assertThat(archivedColumn.getRestorePosition()).isEqualTo(0);
        assertThat(shiftedColumn.getPosition()).isEqualTo(0);
        assertThat(archivedTask.isArchived()).isTrue();
        assertThat(archivedTask.getRestorePosition()).isEqualTo(1_000_000L);
        assertThat(archivedTask.getPosition()).isGreaterThan(1_000_000L);
    }

    @Test
    void updateColumnArchive_restoreReturnsColumnToOriginalPosition() {
        columnService.updateColumnArchive(
                boardId, targetColumnId, new ColumnArchiveRequest(true, true));
        entityManager.flush();
        entityManager.clear();

        ColumnDto restored =
                columnService.updateColumnArchive(
                        boardId, targetColumnId, new ColumnArchiveRequest(false, false));
        entityManager.flush();
        entityManager.clear();

        Column restoredColumn =
                columnRepository
                        .findById(targetColumnId)
                        .orElseThrow(() -> new AssertionError("Expected restored column"));
        Column displacedColumn =
                columnRepository
                        .findById(otherColumnId)
                        .orElseThrow(() -> new AssertionError("Expected sibling column"));

        assertThat(restored.isArchived()).isFalse();
        assertThat(restoredColumn.isArchived()).isFalse();
        assertThat(restoredColumn.getPosition()).isEqualTo(0);
        assertThat(restoredColumn.getRestorePosition()).isNull();
        assertThat(displacedColumn.getPosition()).isEqualTo(1);
    }
}
