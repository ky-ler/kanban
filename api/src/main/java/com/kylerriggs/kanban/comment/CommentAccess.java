package com.kylerriggs.kanban.comment;

import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ForbiddenException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component("commentAccess")
@AllArgsConstructor
@Slf4j
public class CommentAccess extends BaseAccess {
    private final CommentRepository commentRepository;

    /**
     * Checks if the current user is the author of the comment. Required for edit/delete operations.
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isAuthor(UUID commentId) {
        String requestUserId = currentUserId();

        Comment comment =
                commentRepository
                        .findById(commentId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Comment not found: " + commentId));

        boolean isAuthor = comment.getAuthor().getId().equals(requestUserId);

        if (!isAuthor) {
            log.warn(
                    "Access denied: User {} is not the author of comment {}",
                    requestUserId,
                    commentId);
            throw new ForbiddenException("Only the comment author can modify this comment");
        }

        return true;
    }
}
