package com.kylerriggs.kanban.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Finds paginated notifications for a user, ordered by newest first.
     *
     * @param recipientId the recipient's user ID
     * @param pageable pagination parameters
     * @return page of notifications for the user
     */
    Page<Notification> findByRecipientIdOrderByDateCreatedDesc(
            String recipientId, Pageable pageable);

    /**
     * Finds unread paginated notifications for a user, ordered by newest first.
     *
     * @param recipientId the recipient's user ID
     * @param pageable pagination parameters
     * @return page of unread notifications for the user
     */
    Page<Notification> findByRecipientIdAndIsReadFalseOrderByDateCreatedDesc(
            String recipientId, Pageable pageable);

    /**
     * Counts unread notifications for a user.
     *
     * @param recipientId the recipient's user ID
     * @return count of unread notifications
     */
    long countByRecipientIdAndIsReadFalse(String recipientId);

    /**
     * Finds a notification by ID and recipient ID (for ownership verification).
     *
     * @param id the notification ID
     * @param recipientId the recipient's user ID
     * @return the notification if found and owned by the user
     */
    Optional<Notification> findByIdAndRecipientId(UUID id, String recipientId);

    /**
     * Marks all unread notifications as read for a user.
     *
     * @param recipientId the recipient's user ID
     * @param now the current timestamp to set as dateModified
     * @return number of notifications updated
     */
    @Modifying
    @Query(
            "UPDATE Notification n SET n.isRead = true, n.dateModified = :now "
                    + "WHERE n.recipient.id = :recipientId AND n.isRead = false")
    int markAllAsRead(@Param("recipientId") String recipientId, @Param("now") Instant now);

    /**
     * Marks all unread notifications as read for a specific reference ID.
     *
     * @param referenceId the reference ID (e.g., deleted comment ID)
     * @param now the current timestamp to set as dateModified
     * @return number of notifications updated
     */
    @Modifying
    @Query(
            "UPDATE Notification n SET n.isRead = true, n.dateModified = :now "
                    + "WHERE n.referenceId = :referenceId AND n.isRead = false")
    int markAllAsReadByReferenceId(
            @Param("referenceId") UUID referenceId, @Param("now") Instant now);

    /**
     * Deletes notifications older than the specified date.
     *
     * @param cutoffDate notifications created before this date will be deleted
     * @return number of notifications deleted
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.dateCreated < :cutoffDate")
    int deleteOlderThan(@Param("cutoffDate") Instant cutoffDate);
}
