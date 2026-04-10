package com.kylerriggs.velora.notification.event;

import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.board.BoardRepository;
import com.kylerriggs.velora.notification.MentionParser;
import com.kylerriggs.velora.notification.NotificationService;
import com.kylerriggs.velora.notification.NotificationType;
import com.kylerriggs.velora.notification.event.NotificationEvent.AssigneeChangedEvent;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentCreatedEvent;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentDeletedEvent;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentUpdatedEvent;
import com.kylerriggs.velora.notification.event.NotificationEvent.TaskDescriptionUpdatedEvent;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.task.TaskRepository;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Listens for notification-triggering events and creates notifications after the original
 * transaction commits.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;

    /**
     * Handles comment creation events. Creates notifications for: - MENTIONED_IN_COMMENT for
     * users @mentioned in the comment - COMMENT_ON_ASSIGNED_TASK for the task assignee (if not the
     * author and not mentioned)
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleCommentCreated(CommentCreatedEvent event) {
        log.debug("Processing CommentCreatedEvent for comment {}", event.commentId());

        Optional<Task> taskOpt = taskRepository.findById(event.taskId());
        Optional<Board> boardOpt = boardRepository.findById(event.boardId());
        Optional<User> actorOpt = userRepository.findById(event.authorId());

        if (taskOpt.isEmpty() || boardOpt.isEmpty() || actorOpt.isEmpty()) {
            log.warn(
                    "Could not process CommentCreatedEvent: task, board, or actor not found. "
                            + "taskId={}, boardId={}, authorId={}",
                    event.taskId(),
                    event.boardId(),
                    event.authorId());
            return;
        }

        Task task = taskOpt.get();
        Board board = boardOpt.get();
        User actor = actorOpt.get();

        // Extract mentioned users
        Set<String> mentionedUserIds = MentionParser.extractMentionedUserIds(event.content());
        Set<String> notifiedUserIds = new HashSet<>();

        // Notify mentioned users (except the author)
        for (String userId : mentionedUserIds) {
            if (userId.equals(event.authorId())) {
                continue; // Don't notify the author
            }

            Optional<User> recipientOpt = userRepository.findById(userId);
            if (recipientOpt.isEmpty()) {
                log.warn("Mentioned user not found: {}", userId);
                continue;
            }

            User recipient = recipientOpt.get();
            String message =
                    String.format(
                            "%s mentioned you in a comment on \"%s\"",
                            actor.getUsername(), task.getTitle());

            notificationService.createAndBroadcast(
                    NotificationType.MENTIONED_IN_COMMENT,
                    recipient,
                    actor,
                    task,
                    board,
                    message,
                    event.commentId());

            notifiedUserIds.add(userId);
        }

        // Notify task assignee if not the author and not already mentioned
        User assignee = task.getAssignedTo();
        if (assignee != null
                && !assignee.getId().equals(event.authorId())
                && !notifiedUserIds.contains(assignee.getId())) {

            String message =
                    String.format("%s commented on \"%s\"", actor.getUsername(), task.getTitle());

            notificationService.createAndBroadcast(
                    NotificationType.COMMENT_ON_ASSIGNED_TASK,
                    assignee,
                    actor,
                    task,
                    board,
                    message,
                    event.commentId());
        }
    }

    /**
     * Handles comment update events. Creates MENTIONED_IN_COMMENT notifications for users newly
     * mentioned (mentioned in new content but not in old content).
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleCommentUpdated(CommentUpdatedEvent event) {
        log.debug("Processing CommentUpdatedEvent for comment {}", event.commentId());

        Optional<Task> taskOpt = taskRepository.findById(event.taskId());
        Optional<Board> boardOpt = boardRepository.findById(event.boardId());
        Optional<User> actorOpt = userRepository.findById(event.editorId());

        if (taskOpt.isEmpty() || boardOpt.isEmpty() || actorOpt.isEmpty()) {
            log.warn(
                    "Could not process CommentUpdatedEvent: task, board, or editor not found. "
                            + "taskId={}, boardId={}, editorId={}",
                    event.taskId(),
                    event.boardId(),
                    event.editorId());
            return;
        }

        Task task = taskOpt.get();
        Board board = boardOpt.get();
        User actor = actorOpt.get();

        Set<String> oldMentions = MentionParser.extractMentionedUserIds(event.oldContent());
        Set<String> newMentions = MentionParser.extractMentionedUserIds(event.newContent());

        Set<String> newlyMentioned = new HashSet<>(newMentions);
        newlyMentioned.removeAll(oldMentions);

        for (String userId : newlyMentioned) {
            if (userId.equals(event.editorId())) {
                continue;
            }

            Optional<User> recipientOpt = userRepository.findById(userId);
            if (recipientOpt.isEmpty()) {
                log.warn("Mentioned user not found: {}", userId);
                continue;
            }

            User recipient = recipientOpt.get();
            String message =
                    String.format(
                            "%s mentioned you in an edited comment on \"%s\"",
                            actor.getUsername(), task.getTitle());

            notificationService.createAndBroadcast(
                    NotificationType.MENTIONED_IN_COMMENT,
                    recipient,
                    actor,
                    task,
                    board,
                    message,
                    event.commentId());
        }
    }

    /** Handles comment deletion events by marking related notifications as read. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleCommentDeleted(CommentDeletedEvent event) {
        log.debug("Processing CommentDeletedEvent for comment {}", event.commentId());
        notificationService.markAllAsReadByReferenceId(event.commentId());
    }

    /**
     * Handles task description update events. Creates MENTIONED_IN_DESCRIPTION notifications for
     * users newly mentioned (mentioned in new description but not in old description).
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleTaskDescriptionUpdated(TaskDescriptionUpdatedEvent event) {
        log.debug("Processing TaskDescriptionUpdatedEvent for task {}", event.taskId());

        Optional<Task> taskOpt = taskRepository.findById(event.taskId());
        Optional<Board> boardOpt = boardRepository.findById(event.boardId());
        Optional<User> actorOpt = userRepository.findById(event.editorId());

        if (taskOpt.isEmpty() || boardOpt.isEmpty() || actorOpt.isEmpty()) {
            log.warn(
                    "Could not process TaskDescriptionUpdatedEvent: task, board, or actor not found. "
                            + "taskId={}, boardId={}, editorId={}",
                    event.taskId(),
                    event.boardId(),
                    event.editorId());
            return;
        }

        Task task = taskOpt.get();
        Board board = boardOpt.get();
        User actor = actorOpt.get();

        // Find users mentioned in new description but not in old description
        Set<String> oldMentions = MentionParser.extractMentionedUserIds(event.oldDescription());
        Set<String> newMentions = MentionParser.extractMentionedUserIds(event.newDescription());

        Set<String> newlyMentioned = new HashSet<>(newMentions);
        newlyMentioned.removeAll(oldMentions);

        for (String userId : newlyMentioned) {
            if (userId.equals(event.editorId())) {
                continue; // Don't notify the editor
            }

            Optional<User> recipientOpt = userRepository.findById(userId);
            if (recipientOpt.isEmpty()) {
                log.warn("Mentioned user not found: {}", userId);
                continue;
            }

            User recipient = recipientOpt.get();
            String message =
                    String.format(
                            "%s mentioned you in the description of \"%s\"",
                            actor.getUsername(), task.getTitle());

            notificationService.createAndBroadcast(
                    NotificationType.MENTIONED_IN_DESCRIPTION,
                    recipient,
                    actor,
                    task,
                    board,
                    message,
                    null);
        }
    }

    /**
     * Handles assignee change events. Creates ASSIGNED_TO_TASK notification for the new assignee
     * (if not the person who made the change).
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAssigneeChanged(AssigneeChangedEvent event) {
        log.debug(
                "Processing AssigneeChangedEvent for task {}: {} -> {}",
                event.taskId(),
                event.oldAssigneeId(),
                event.newAssigneeId());

        // Don't notify if the new assignee made the change themselves
        if (event.newAssigneeId().equals(event.changedById())) {
            return;
        }

        Optional<Task> taskOpt = taskRepository.findById(event.taskId());
        Optional<Board> boardOpt = boardRepository.findById(event.boardId());
        Optional<User> actorOpt = userRepository.findById(event.changedById());
        Optional<User> recipientOpt = userRepository.findById(event.newAssigneeId());

        if (taskOpt.isEmpty()
                || boardOpt.isEmpty()
                || actorOpt.isEmpty()
                || recipientOpt.isEmpty()) {
            log.warn(
                    "Could not process AssigneeChangedEvent: task, board, actor, or recipient not found. "
                            + "taskId={}, boardId={}, changedById={}, newAssigneeId={}",
                    event.taskId(),
                    event.boardId(),
                    event.changedById(),
                    event.newAssigneeId());
            return;
        }

        Task task = taskOpt.get();
        Board board = boardOpt.get();
        User actor = actorOpt.get();
        User recipient = recipientOpt.get();

        String message =
                String.format("%s assigned you to \"%s\"", actor.getUsername(), task.getTitle());

        notificationService.createAndBroadcast(
                NotificationType.ASSIGNED_TO_TASK, recipient, actor, task, board, message, null);
    }
}
