package com.kylerriggs.kanban.notification.event;

import java.util.UUID;

/**
 * Sealed interface for notification-triggering events. These events are published by services and
 * consumed by NotificationEventListener to create notifications after transaction commit.
 */
public sealed interface NotificationEvent
        permits NotificationEvent.CommentCreatedEvent,
                NotificationEvent.CommentUpdatedEvent,
                NotificationEvent.CommentDeletedEvent,
                NotificationEvent.TaskDescriptionUpdatedEvent,
                NotificationEvent.AssigneeChangedEvent {

    /**
     * Published when a comment is created on a task. Triggers MENTIONED_IN_COMMENT and
     * COMMENT_ON_ASSIGNED_TASK notifications.
     */
    record CommentCreatedEvent(
            UUID commentId, UUID taskId, UUID boardId, String authorId, String content)
            implements NotificationEvent {}

    /**
     * Published when a comment is updated. Triggers MENTIONED_IN_COMMENT notifications for users
     * newly mentioned in the updated content.
     */
    record CommentUpdatedEvent(
            UUID commentId,
            UUID taskId,
            UUID boardId,
            String editorId,
            String oldContent,
            String newContent)
            implements NotificationEvent {}

    /** Published when a comment is deleted. */
    record CommentDeletedEvent(UUID commentId) implements NotificationEvent {}

    /**
     * Published when a task's description is updated. Triggers MENTIONED_IN_DESCRIPTION
     * notifications for newly mentioned users.
     */
    record TaskDescriptionUpdatedEvent(
            UUID taskId,
            UUID boardId,
            String editorId,
            String newDescription,
            String oldDescription)
            implements NotificationEvent {}

    /**
     * Published when a task's assignee is changed. Triggers ASSIGNED_TO_TASK notification for the
     * new assignee.
     */
    record AssigneeChangedEvent(
            UUID taskId,
            UUID boardId,
            String changedById,
            String newAssigneeId,
            String oldAssigneeId)
            implements NotificationEvent {}
}
