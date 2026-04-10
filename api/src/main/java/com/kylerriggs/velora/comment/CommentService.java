package com.kylerriggs.velora.comment;

import com.kylerriggs.velora.comment.dto.CommentDto;
import com.kylerriggs.velora.comment.dto.CommentRequest;
import com.kylerriggs.velora.exception.ResourceNotFoundException;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentCreatedEvent;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentDeletedEvent;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentUpdatedEvent;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.task.TaskRepository;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserLookupService;
import com.kylerriggs.velora.websocket.BoardEventPublisher;
import com.kylerriggs.velora.websocket.dto.BoardEventType;

import lombok.RequiredArgsConstructor;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final CommentMapper commentMapper;
    private final TaskRepository taskRepository;
    private final UserLookupService userLookupService;
    private final BoardEventPublisher eventPublisher;
    private final ApplicationEventPublisher applicationEventPublisher;

    /**
     * Retrieves all comments for a task, ordered by oldest first.
     *
     * @param taskId the ID of the task
     * @return list of comment DTOs
     */
    public List<CommentDto> getCommentsForTask(@NonNull UUID boardId, @NonNull UUID taskId) {
        requireTaskInBoard(boardId, taskId);
        return commentRepository.findByTaskIdOrderByDateCreatedAsc(taskId).stream()
                .map(commentMapper::toDto)
                .toList();
    }

    /**
     * Creates a new comment on a task.
     *
     * @param taskId the ID of the task
     * @param request the comment request containing content
     * @return the created comment DTO
     */
    @Transactional
    public CommentDto createComment(
            @NonNull UUID boardId, @NonNull UUID taskId, @NonNull CommentRequest request) {
        Task task = requireTaskInBoard(boardId, taskId);

        User author = userLookupService.getRequiredCurrentUser();

        Comment comment =
                Comment.builder().content(request.content()).task(task).author(author).build();

        Comment saved = commentRepository.save(comment);

        eventPublisher.publish(
                BoardEventType.COMMENT_ADDED, task.getBoard().getId(), saved.getId());

        // Publish notification event for mentions and task assignee
        applicationEventPublisher.publishEvent(
                new CommentCreatedEvent(
                        saved.getId(),
                        task.getId(),
                        task.getBoard().getId(),
                        author.getId(),
                        request.content()));

        return commentMapper.toDto(saved);
    }

    /**
     * Updates an existing comment.
     *
     * @param commentId the ID of the comment
     * @param request the comment request containing new content
     * @return the updated comment DTO
     */
    @Transactional
    public CommentDto updateComment(
            @NonNull UUID boardId,
            @NonNull UUID taskId,
            @NonNull UUID commentId,
            @NonNull CommentRequest request) {
        Comment comment =
                commentRepository
                        .findById(commentId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Comment not found: " + commentId));

        validateCommentContext(comment, boardId, taskId, commentId);

        String oldContent = comment.getContent();
        comment.setContent(request.content());
        comment.setDateModified(Instant.now());

        Comment saved = commentRepository.save(comment);

        eventPublisher.publish(
                BoardEventType.COMMENT_UPDATED,
                comment.getTask().getBoard().getId(),
                saved.getId());

        User editor = userLookupService.getRequiredCurrentUser();
        applicationEventPublisher.publishEvent(
                new CommentUpdatedEvent(
                        saved.getId(),
                        comment.getTask().getId(),
                        comment.getTask().getBoard().getId(),
                        editor.getId(),
                        oldContent,
                        saved.getContent()));

        return commentMapper.toDto(saved);
    }

    /**
     * Deletes a comment.
     *
     * @param commentId the ID of the comment to delete
     */
    @Transactional
    public void deleteComment(
            @NonNull UUID boardId, @NonNull UUID taskId, @NonNull UUID commentId) {
        Comment comment =
                commentRepository
                        .findById(commentId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Comment not found: " + commentId));

        validateCommentContext(comment, boardId, taskId, commentId);

        UUID commentBoardId = comment.getTask().getBoard().getId();

        commentRepository.delete(comment);

        eventPublisher.publish(BoardEventType.COMMENT_DELETED, commentBoardId, commentId);

        applicationEventPublisher.publishEvent(new CommentDeletedEvent(commentId));
    }

    private Task requireTaskInBoard(UUID boardId, UUID taskId) {
        return taskRepository
                .findByIdAndBoardId(taskId, boardId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Task not found in board: " + taskId));
    }

    private void validateCommentContext(
            Comment comment, UUID boardId, UUID taskId, UUID commentId) {
        UUID commentTaskId = comment.getTask().getId();
        UUID commentBoardId = comment.getTask().getBoard().getId();
        if (!commentTaskId.equals(taskId) || !commentBoardId.equals(boardId)) {
            throw new ResourceNotFoundException(
                    "Comment not found in task/board context: " + commentId);
        }
    }
}
