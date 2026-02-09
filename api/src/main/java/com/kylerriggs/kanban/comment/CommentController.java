package com.kylerriggs.kanban.comment;

import com.kylerriggs.kanban.comment.dto.CommentDto;
import com.kylerriggs.kanban.comment.dto.CommentRequest;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/boards/{boardId}/tasks/{taskId}/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    /**
     * Retrieves all comments for a task, ordered by oldest first. Requires the user to be a
     * collaborator on the board.
     *
     * @param boardId the ID of the board (used for authorization)
     * @param taskId the ID of the task
     * @return list of comment DTOs
     */
    @GetMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<List<CommentDto>> getTaskComments(
            @NonNull @PathVariable UUID boardId, @NonNull @PathVariable UUID taskId) {
        List<CommentDto> comments = commentService.getCommentsForTask(boardId, taskId);
        return ResponseEntity.ok(comments);
    }

    /**
     * Creates a new comment on a task. Requires the user to be a collaborator on the board.
     *
     * @param boardId the ID of the board (used for authorization)
     * @param taskId the ID of the task
     * @param request the comment request containing content
     * @return the created comment DTO
     */
    @PostMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<CommentDto> createComment(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @Valid @RequestBody CommentRequest request) {
        CommentDto comment = commentService.createComment(boardId, taskId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    /**
     * Updates an existing comment. Only the comment author can update their comment.
     *
     * @param boardId the ID of the board (used for context)
     * @param taskId the ID of the task (used for context)
     * @param commentId the ID of the comment to update
     * @param request the comment request containing new content
     * @return the updated comment DTO
     */
    @PutMapping("/{commentId}")
    @PreAuthorize("@commentAccess.isAuthor(#commentId)")
    public ResponseEntity<CommentDto> updateComment(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @NonNull @PathVariable UUID commentId,
            @Valid @RequestBody CommentRequest request) {
        CommentDto comment = commentService.updateComment(boardId, taskId, commentId, request);
        return ResponseEntity.ok(comment);
    }

    /**
     * Deletes a comment. Only the comment author can delete their comment.
     *
     * @param boardId the ID of the board (used for context)
     * @param taskId the ID of the task (used for context)
     * @param commentId the ID of the comment to delete
     * @return empty response with 204 No Content
     */
    @DeleteMapping("/{commentId}")
    @PreAuthorize("@commentAccess.isAuthor(#commentId)")
    public ResponseEntity<Void> deleteComment(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @NonNull @PathVariable UUID commentId) {
        commentService.deleteComment(boardId, taskId, commentId);
        return ResponseEntity.noContent().build();
    }
}
