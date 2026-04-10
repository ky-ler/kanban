package com.kylerriggs.velora.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/** Scheduler that cleans up old notifications to prevent unbounded database growth. */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationCleanupScheduler {
    private static final Duration RETENTION_PERIOD = Duration.ofDays(90);

    private final NotificationRepository notificationRepository;

    /** Deletes notifications older than 90 days. Runs daily at 3:00 AM. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        Instant cutoffDate = Instant.now().minus(RETENTION_PERIOD);
        int deletedCount = notificationRepository.deleteOlderThan(cutoffDate);

        if (deletedCount > 0) {
            log.info("Cleaned up {} notifications older than {}", deletedCount, cutoffDate);
        }
    }
}
