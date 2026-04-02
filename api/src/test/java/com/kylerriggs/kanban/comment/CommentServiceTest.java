package com.kylerriggs.kanban.comment;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.comment.dto.CommentRequest;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.notification.event.NotificationEvent.CommentDeletedEvent;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.UserLookupService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;
import com.kylerriggs.kanban.websocket.dto.BoardEventType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {
    private static final String USER_ID = "auth0|user123";
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");
    private static final UUID OTHER_BOARD_ID =
            UUID.fromString("b256c2d0-891b-44de-816b-c9259cd00392");
    private static final UUID TASK_ID = UUID.fromString("c356c2d0-891b-44de-816b-c9259cd00393");
    private static final UUID OTHER_TASK_ID =
            UUID.fromString("d456c2d0-891b-44de-816b-c9259cd00394");
    private static final UUID COMMENT_ID = UUID.fromString("e556c2d0-891b-44de-816b-c9259cd00395");

    @Mock private CommentRepository commentRepository;
    @Mock private CommentMapper commentMapper;
    @Mock private TaskRepository taskRepository;
    @Mock private UserLookupService userLookupService;
    @Mock private BoardEventPublisher eventPublisher;
    @Mock private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks private CommentService commentService;

    private Comment commentInOtherTask;

    @BeforeEach
    void setUp() {
        Board otherBoard = Board.builder().id(OTHER_BOARD_ID).name("Other Board").build();
        Task otherTask =
                Task.builder()
                        .id(OTHER_TASK_ID)
                        .title("Other Task")
                        .position(1L)
                        .board(otherBoard)
                        .build();
        commentInOtherTask =
                Comment.builder()
                        .id(COMMENT_ID)
                        .content("Existing comment")
                        .task(otherTask)
                        .build();
    }

    @Test
    void getCommentsForTask_WhenTaskIsNotInBoard_ThrowsResourceNotFoundException() {
        when(taskRepository.findByIdAndBoardId(TASK_ID, BOARD_ID)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> commentService.getCommentsForTask(BOARD_ID, TASK_ID));

        verify(commentRepository, never()).findByTaskIdOrderByDateCreatedAsc(any());
    }

    @Test
    void createComment_WhenTaskIsNotInBoard_ThrowsResourceNotFoundException() {
        when(taskRepository.findByIdAndBoardId(TASK_ID, BOARD_ID)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> commentService.createComment(BOARD_ID, TASK_ID, new CommentRequest("Hello")));

        verify(commentRepository, never()).save(any());
    }

    @Test
    void updateComment_WhenPathContextMismatchesComment_ThrowsResourceNotFoundException() {
        when(commentRepository.findById(COMMENT_ID)).thenReturn(Optional.of(commentInOtherTask));

        assertThrows(
                ResourceNotFoundException.class,
                () ->
                        commentService.updateComment(
                                BOARD_ID, TASK_ID, COMMENT_ID, new CommentRequest("Updated")));

        verify(commentRepository, never()).save(any());
    }

    @Test
    void deleteComment_WhenPathContextMismatchesComment_ThrowsResourceNotFoundException() {
        when(commentRepository.findById(COMMENT_ID)).thenReturn(Optional.of(commentInOtherTask));

        assertThrows(
                ResourceNotFoundException.class,
                () -> commentService.deleteComment(BOARD_ID, TASK_ID, COMMENT_ID));

        verify(commentRepository, never()).delete(any());
    }

    @Test
    void deleteComment_WhenContextMatches_DeletesAndPublishesLifecycleEvent() {
        Board board = Board.builder().id(BOARD_ID).name("Board").build();
        Task task = Task.builder().id(TASK_ID).title("Task").position(1L).board(board).build();
        Comment comment = Comment.builder().id(COMMENT_ID).content("Existing").task(task).build();
        when(commentRepository.findById(COMMENT_ID)).thenReturn(Optional.of(comment));

        commentService.deleteComment(BOARD_ID, TASK_ID, COMMENT_ID);

        verify(commentRepository).delete(comment);
        verify(eventPublisher).publish(BoardEventType.COMMENT_DELETED, BOARD_ID, COMMENT_ID);
        verify(applicationEventPublisher).publishEvent(new CommentDeletedEvent(COMMENT_ID));
    }
}
