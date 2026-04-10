package com.kylerriggs.velora.notification;

import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.common.BaseEntity;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.user.User;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(
        name = "notifications",
        indexes = {
            @Index(
                    name = "idx_notifications_recipient_unread",
                    columnList = "recipient_id, is_read"),
            @Index(
                    name = "idx_notifications_recipient_created",
                    columnList = "recipient_id, date_created")
        })
public class Notification extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", foreignKey = @ForeignKey(name = "fk_notification_recipient"))
    private User recipient;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", foreignKey = @ForeignKey(name = "fk_notification_actor"))
    private User actor;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", foreignKey = @ForeignKey(name = "fk_notification_task"))
    private Task task;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", foreignKey = @ForeignKey(name = "fk_notification_board"))
    private Board board;

    @Column(name = "reference_id")
    private UUID referenceId;
}
