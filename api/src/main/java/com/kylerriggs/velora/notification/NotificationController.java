package com.kylerriggs.velora.notification;

import com.kylerriggs.velora.notification.dto.NotificationDto;
import com.kylerriggs.velora.notification.dto.UnreadCountDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    /**
     * Retrieves paginated notifications for the current user.
     *
     * @param page zero-based page index (default 0)
     * @param size number of items per page (default 20)
     * @return page of notification DTOs
     */
    @GetMapping
    public ResponseEntity<Page<NotificationDto>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        Page<NotificationDto> notifications =
                notificationService.getNotifications(page, size, unreadOnly);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Gets the unread notification count for the current user.
     *
     * @return DTO containing the unread count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDto> getUnreadCount() {
        UnreadCountDto count = notificationService.getUnreadCount();
        return ResponseEntity.ok(count);
    }

    /**
     * Marks a single notification as read.
     *
     * @param id the notification ID
     * @return 204 No Content on success
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Marks all notifications as read for the current user.
     *
     * @return 204 No Content on success
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.noContent().build();
    }
}
