package com.kylerriggs.velora.activity;

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
        name = "activity_logs",
        indexes = {
            @Index(name = "idx_activity_logs_task_id", columnList = "task_id"),
            @Index(name = "idx_activity_logs_board_id", columnList = "board_id")
        })
public class ActivityLog extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ActivityType type;

    @Column(columnDefinition = "TEXT")
    private String details;

    @ManyToOne(optional = false)
    @JoinColumn(name = "board_id", foreignKey = @ForeignKey(name = "fk_activity_log_board"))
    private Board board;

    @ManyToOne(optional = true)
    @JoinColumn(name = "task_id", foreignKey = @ForeignKey(name = "fk_activity_log_task"))
    private Task task;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_activity_log_user"))
    private User user;
}
