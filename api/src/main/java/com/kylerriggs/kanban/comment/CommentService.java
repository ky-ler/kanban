package com.kylerriggs.kanban.comment;

import com.kylerriggs.kanban.comment.dto.CommentDto;
import com.kylerriggs.kanban.comment.dto.CommentRequest;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final CommentMapper commentMapper;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final BoardEventPublisher eventPublisher;

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
        String currentUserId = userService.getCurrentUserId();

        if (currentUserId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        Task task = requireTaskInBoard(boardId, taskId);

        User author =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "User not found: " + currentUserId));

        Comment comment =
                Comment.builder().content(request.content()).task(task).author(author).build();

        Comment saved = commentRepository.save(Objects.requireNonNull(comment));

        eventPublisher.publish(
                "COMMENT_ADDED", Objects.requireNonNull(task.getBoard().getId()), saved.getId());

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

        comment.setContent(request.content());
        comment.setDateModified(Instant.now());

        Comment saved = commentRepository.save(comment);

        eventPublisher.publish(
                "COMMENT_UPDATED",
                Objects.requireNonNull(comment.getTask().getBoard().getId()),
                saved.getId());

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

        eventPublisher.publish(
                "COMMENT_DELETED", Objects.requireNonNull(commentBoardId), commentId);
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
