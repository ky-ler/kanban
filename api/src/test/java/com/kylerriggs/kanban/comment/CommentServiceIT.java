package com.kylerriggs.kanban.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardRole;
import com.kylerriggs.kanban.board.BoardUser;
import com.kylerriggs.kanban.board.BoardUserRepository;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.comment.dto.CommentDto;
import com.kylerriggs.kanban.comment.dto.CommentRequest;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
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

import java.util.List;

@SpringBootTest
@Transactional
class CommentServiceIT extends PostgresIntegrationTestBase {

    @Autowired private CommentService commentService;
    @Autowired private CommentRepository commentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardUserRepository boardUserRepository;
    @Autowired private ColumnRepository columnRepository;
    @Autowired private TaskRepository taskRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private BoardEventPublisher boardEventPublisher;

    private User owner;
    private User collaborator;
    private Board board;
    private Column column;
    private Task task;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        owner =
                userRepository.save(
                        User.builder()
                                .id("auth0|comment-owner")
                                .username("comment-owner")
                                .email("comment-owner@example.com")
                                .profileImageUrl("https://example.com/comment-owner.png")
                                .build());
        collaborator =
                userRepository.save(
                        User.builder()
                                .id("auth0|comment-collab")
                                .username("comment-collab")
                                .email("comment-collab@example.com")
                                .profileImageUrl("https://example.com/comment-collab.png")
                                .build());

        board =
                boardRepository.save(
                        Board.builder()
                                .name("Comment Service IT")
                                .description("comment board")
                                .createdBy(owner)
                                .build());
        boardUserRepository.save(
                BoardUser.builder().board(board).user(owner).role(BoardRole.ADMIN).build());
        boardUserRepository.save(
                BoardUser.builder().board(board).user(collaborator).role(BoardRole.MEMBER).build());

        column =
                columnRepository.save(
                        Column.builder()
                                .name("To Do")
                                .position(0)
                                .board(board)
                                .isArchived(false)
                                .build());

        task =
                taskRepository.save(
                        Task.builder()
                                .title("Task with comments")
                                .description("task")
                                .position(1_000_000L)
                                .board(board)
                                .column(column)
                                .createdBy(owner)
                                .build());
    }

    @Test
    void createUpdateDeleteComment_persistsAndPublishesEvents() {
        withAuthenticatedUser(owner.getId());

        CommentDto created =
                commentService.createComment(
                        board.getId(), task.getId(), new CommentRequest("Initial comment"));
        entityManager.flush();
        entityManager.clear();

        Comment persisted =
                commentRepository
                        .findById(created.id())
                        .orElseThrow(() -> new AssertionError("Expected comment to exist"));
        assertThat(persisted.getContent()).isEqualTo("Initial comment");
        assertThat(persisted.getAuthor().getId()).isEqualTo(owner.getId());

        CommentDto updated =
                commentService.updateComment(
                        board.getId(),
                        task.getId(),
                        created.id(),
                        new CommentRequest("Updated comment"));
        entityManager.flush();
        entityManager.clear();

        Comment updatedEntity =
                commentRepository
                        .findById(updated.id())
                        .orElseThrow(() -> new AssertionError("Expected updated comment"));
        assertThat(updatedEntity.getContent()).isEqualTo("Updated comment");

        commentService.deleteComment(board.getId(), task.getId(), created.id());
        entityManager.flush();
        entityManager.clear();

        assertThat(commentRepository.findById(created.id())).isEmpty();
        verify(boardEventPublisher)
                .publish(BoardEventType.COMMENT_ADDED, board.getId(), created.id());
        verify(boardEventPublisher)
                .publish(BoardEventType.COMMENT_UPDATED, board.getId(), created.id());
        verify(boardEventPublisher)
                .publish(BoardEventType.COMMENT_DELETED, board.getId(), created.id());
    }

    @Test
    void getCommentsForTask_returnsOldestFirst() {
        withAuthenticatedUser(owner.getId());
        commentService.createComment(board.getId(), task.getId(), new CommentRequest("first"));
        commentService.createComment(board.getId(), task.getId(), new CommentRequest("second"));
        entityManager.flush();
        entityManager.clear();

        List<CommentDto> comments = commentService.getCommentsForTask(board.getId(), task.getId());

        assertThat(comments).hasSize(2);
        assertThat(comments.get(0).content()).isEqualTo("first");
        assertThat(comments.get(1).content()).isEqualTo("second");
    }

    @Test
    void updateComment_withMismatchedBoardContext_throwsNotFound() {
        withAuthenticatedUser(owner.getId());
        CommentDto created =
                commentService.createComment(
                        board.getId(), task.getId(), new CommentRequest("ctx check"));

        Board otherBoard =
                boardRepository.save(
                        Board.builder()
                                .name("Other board")
                                .description("other")
                                .createdBy(owner)
                                .build());

        assertThatThrownBy(
                        () ->
                                commentService.updateComment(
                                        otherBoard.getId(),
                                        task.getId(),
                                        created.id(),
                                        new CommentRequest("should fail")))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Comment not found in task/board context");
    }

    private void withAuthenticatedUser(String userId) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new org.springframework.security.authentication
                                .UsernamePasswordAuthenticationToken(userId, "n/a", List.of()));
    }
}
