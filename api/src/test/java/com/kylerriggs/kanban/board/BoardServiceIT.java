package com.kylerriggs.kanban.board;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.kylerriggs.kanban.board.dto.BoardArchiveRequest;
import com.kylerriggs.kanban.board.dto.BoardRequest;
import com.kylerriggs.kanban.board.dto.CollaboratorRequest;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.support.PostgresIntegrationTestBase;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;
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

import java.util.UUID;

@SpringBootTest
@Transactional
class BoardServiceIT extends PostgresIntegrationTestBase {

    @Autowired private BoardService boardService;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardUserRepository boardUserRepository;
    @Autowired private ColumnRepository columnRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private BoardProperties boardProperties;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private BoardEventPublisher boardEventPublisher;

    private User owner;
    private User collaborator;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        owner =
                userRepository.save(
                        User.builder()
                                .id("auth0|board-owner")
                                .username("board-owner")
                                .email("board-owner@example.com")
                                .profileImageUrl("https://example.com/owner.png")
                                .build());
        collaborator =
                userRepository.save(
                        User.builder()
                                .id("auth0|board-collaborator")
                                .username("board-collaborator")
                                .email("board-collaborator@example.com")
                                .profileImageUrl("https://example.com/collaborator.png")
                                .build());
    }

    @Test
    void createBoard_persistsOwnerMembershipAndDefaultColumns() {
        withAuthenticatedUser(owner.getId());

        UUID boardId =
                boardService
                        .createBoard(
                                new BoardRequest(
                                        "Integration Board", "for persistence tests", false))
                        .id();

        entityManager.flush();
        entityManager.clear();

        Board persistedBoard =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(() -> new AssertionError("Expected board to be persisted"));

        assertThat(persistedBoard.getCreatedBy().getId()).isEqualTo(owner.getId());
        assertThat(persistedBoard.getColumns())
                .extracting(column -> column.getName())
                .containsExactlyElementsOf(boardProperties.getDefaultColumns());
        assertThat(
                        boardUserRepository.existsByBoardIdAndUserIdAndRole(
                                boardId, owner.getId(), BoardRole.ADMIN))
                .isTrue();
    }

    @Test
    void addCollaborator_persistsMembershipWithRequestedRole() {
        UUID boardId = createBoardForOwner();
        withAuthenticatedUser(owner.getId());

        boardService.addCollaborator(
                boardId, new CollaboratorRequest(collaborator.getId(), BoardRole.MEMBER));

        entityManager.flush();
        entityManager.clear();

        BoardUser membership =
                boardUserRepository
                        .findByBoardIdAndUserId(boardId, collaborator.getId())
                        .orElseThrow(() -> new AssertionError("Expected collaborator membership"));
        assertThat(membership.getRole()).isEqualTo(BoardRole.MEMBER);
    }

    @Test
    void updateBoardArchive_requiresConfirmWhenBoardHasActiveTasks() {
        UUID boardId = createBoardForOwner();
        UUID firstColumnId = firstColumnId(boardId);
        seedTask(boardId, firstColumnId, false);
        withAuthenticatedUser(owner.getId());

        assertThatThrownBy(
                        () ->
                                boardService.updateBoardArchive(
                                        boardId, new BoardArchiveRequest(true, false)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("confirmArchiveTasks=true");

        verify(boardEventPublisher, never())
                .publish(any(BoardEventType.class), any(UUID.class), any(UUID.class));
    }

    @Test
    void updateBoardArchive_withConfirm_archivesTasksAndBoard() {
        UUID boardId = createBoardForOwner();
        UUID firstColumnId = firstColumnId(boardId);
        UUID taskId = seedTask(boardId, firstColumnId, false);
        withAuthenticatedUser(owner.getId());

        boardService.updateBoardArchive(boardId, new BoardArchiveRequest(true, true));

        entityManager.flush();
        entityManager.clear();

        Board archivedBoard =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(() -> new AssertionError("Expected board to exist"));
        Task archivedTask =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(() -> new AssertionError("Expected task to exist"));

        assertThat(archivedBoard.isArchived()).isTrue();
        assertThat(archivedTask.isArchived()).isTrue();
        assertThat(archivedTask.getRestorePosition()).isNotNull();
    }

    private UUID createBoardForOwner() {
        withAuthenticatedUser(owner.getId());
        return boardService
                .createBoard(new BoardRequest("Owner Board", "owner board for IT", false))
                .id();
    }

    private UUID firstColumnId(UUID boardId) {
        Board board =
                boardRepository
                        .findByIdWithDetails(boardId)
                        .orElseThrow(() -> new AssertionError("Expected board to exist"));
        return board.getColumns().stream()
                .findFirst()
                .orElseThrow(() -> new AssertionError("Expected default columns"))
                .getId();
    }

    private UUID seedTask(UUID boardId, UUID columnId, boolean archived) {
        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(() -> new AssertionError("Expected board to exist"));
        Column column =
                columnRepository
                        .findById(columnId)
                        .orElseThrow(() -> new AssertionError("Expected column to exist"));

        Task task =
                taskRepository.save(
                        Task.builder()
                                .title("Board service task")
                                .description("task for archive flow")
                                .position(1_000_000L)
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
                                .UsernamePasswordAuthenticationToken(
                                userId, "n/a", java.util.List.of()));
    }
}
