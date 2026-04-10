package com.kylerriggs.velora.notification;

import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.exception.ResourceNotFoundException;
import com.kylerriggs.velora.notification.dto.NotificationDto;
import com.kylerriggs.velora.notification.dto.UnreadCountDto;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private static final String USER_NOTIFICATIONS_TOPIC = "/topic/users/%s/notifications";

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Retrieves paginated notifications for the current user, ordered by newest first.
     *
     * @param page zero-based page index
     * @param size number of items per page
     * @return page of notification DTOs
     */
    @Transactional(readOnly = true)
    public Page<NotificationDto> getNotifications(int page, int size, boolean unreadOnly) {
        String userId = userService.getCurrentUserId();
        if (unreadOnly) {
            return notificationRepository
                    .findByRecipientIdAndIsReadFalseOrderByDateCreatedDesc(
                            userId, PageRequest.of(page, size))
                    .map(notificationMapper::toDto);
        }
        return notificationRepository
                .findByRecipientIdOrderByDateCreatedDesc(userId, PageRequest.of(page, size))
                .map(notificationMapper::toDto);
    }

    /**
     * Gets the unread notification count for the current user.
     *
     * @return DTO containing the count
     */
    @Transactional(readOnly = true)
    public UnreadCountDto getUnreadCount() {
        String userId = userService.getCurrentUserId();
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        return new UnreadCountDto(count);
    }

    /**
     * Marks a single notification as read.
     *
     * @param notificationId the notification ID
     * @throws ResourceNotFoundException if notification not found or not owned by current user
     */
    @Transactional
    public void markAsRead(@NonNull UUID notificationId) {
        String userId = userService.getCurrentUserId();
        Notification notification =
                notificationRepository
                        .findByIdAndRecipientId(notificationId, userId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Notification not found: " + notificationId));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setDateModified(Instant.now());
            notificationRepository.save(notification);
        }
    }

    /**
     * Marks all notifications as read for the current user.
     *
     * @return number of notifications marked as read
     */
    @Transactional
    public int markAllAsRead() {
        String userId = userService.getCurrentUserId();
        return notificationRepository.markAllAsRead(userId, Instant.now());
    }

    /**
     * Marks all unread notifications as read for a specific reference ID.
     *
     * <p>Used for lifecycle cleanup when a referenced entity (e.g., comment) is deleted so related
     * notifications remain as historical records but no longer appear as actionable unread items.
     *
     * @param referenceId reference ID to match
     * @return number of notifications marked as read
     */
    @Transactional
    public int markAllAsReadByReferenceId(@NonNull UUID referenceId) {
        return notificationRepository.markAllAsReadByReferenceId(referenceId, Instant.now());
    }

    /**
     * Creates a notification and broadcasts it via WebSocket to the recipient.
     *
     * @param type the notification type
     * @param recipient the user to notify
     * @param actor the user who triggered the notification
     * @param task the task related to the notification
     * @param board the board the task belongs to
     * @param message the notification message
     * @param referenceId optional reference ID (e.g., comment ID)
     * @return the created notification DTO
     */
    @Transactional
    public NotificationDto createAndBroadcast(
            @NonNull NotificationType type,
            @NonNull User recipient,
            @NonNull User actor,
            @NonNull Task task,
            @NonNull Board board,
            @NonNull String message,
            @Nullable UUID referenceId) {

        Notification notification =
                Notification.builder()
                        .type(type)
                        .recipient(recipient)
                        .actor(actor)
                        .task(task)
                        .board(board)
                        .message(message)
                        .referenceId(referenceId)
                        .build();

        Notification saved = notificationRepository.save(notification);
        NotificationDto dto = notificationMapper.toDto(saved);

        // Broadcast to the recipient's personal notification topic
        String destination = String.format(USER_NOTIFICATIONS_TOPIC, recipient.getId());
        try {
            messagingTemplate.convertAndSend(destination, dto);
            log.debug(
                    "Notification broadcast to {}: type={}, taskId={}",
                    destination,
                    type,
                    task.getId());
        } catch (MessagingException e) {
            log.warn("Failed to broadcast notification to {}: {}", destination, e.getMessage());
        }

        return dto;
    }
}
