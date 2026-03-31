package com.kylerriggs.kanban.column;

import static org.assertj.core.api.Assertions.assertThat;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
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

import java.util.UUID;

@SpringBootTest
@Transactional
class ColumnRepositoryIT extends PostgresIntegrationTestBase {

    @Autowired private ColumnRepository columnRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;

    private UUID boardId;
    private UUID activeColumnAtOneId;
    private UUID archivedColumnId;

    @BeforeEach
    void setUp() {
        User user =
                User.builder()
                        .id("auth0|integration-user")
                        .username("integration-user")
                        .email("integration-user@example.com")
                        .profileImageUrl("https://example.com/avatar.png")
                        .build();
        userRepository.save(user);

        Board board = Board.builder().name("Integration Board").createdBy(user).build();
        board = boardRepository.save(board);
        boardId = board.getId();

        Column activeAtZero =
                columnRepository.save(
                        Column.builder()
                                .name("Backlog")
                                .position(0)
                                .board(board)
                                .isArchived(false)
                                .build());
        activeColumnAtOneId =
                columnRepository
                        .save(
                                Column.builder()
                                        .name("In Progress")
                                        .position(1)
                                        .board(board)
                                        .isArchived(false)
                                        .build())
                        .getId();
        archivedColumnId =
                columnRepository
                        .save(
                                Column.builder()
                                        .name("Archived")
                                        .position(5)
                                        .board(board)
                                        .isArchived(true)
                                        .build())
                        .getId();
        assertThat(activeAtZero.getId()).isNotNull();
    }

    @Test
    void countByBoardIdAndIsArchivedFalse_countsOnlyActiveColumns() {
        long activeCount = columnRepository.countByBoardIdAndIsArchivedFalse(boardId);

        assertThat(activeCount).isEqualTo(2L);
    }

    @Test
    void incrementActivePositionsFrom_updatesOnlyActiveColumns() {
        columnRepository.incrementActivePositionsFrom(boardId, 1);
        entityManager.flush();
        entityManager.clear();

        Column activeColumnAtOne =
                columnRepository
                        .findById(activeColumnAtOneId)
                        .orElseThrow(() -> new AssertionError("Expected active column to exist"));
        Column archivedColumn =
                columnRepository
                        .findById(archivedColumnId)
                        .orElseThrow(() -> new AssertionError("Expected archived column to exist"));

        assertThat(activeColumnAtOne.getPosition()).isEqualTo(2);
        assertThat(archivedColumn.getPosition()).isEqualTo(5);
    }
}
