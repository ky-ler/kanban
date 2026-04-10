package com.kylerriggs.velora.checklist;

import com.kylerriggs.velora.common.BaseEntity;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.user.User;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(
        name = "checklist_items",
        indexes = {@Index(name = "idx_checklist_items_task_id", columnList = "task_id")},
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_checklist_item_task_position",
                    columnNames = {"task_id", "position"})
        })
public class ChecklistItem extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String title;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean isCompleted = false;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "position", nullable = false)
    private Long position;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", foreignKey = @ForeignKey(name = "fk_checklist_item_task"))
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "assigned_to_id",
            foreignKey = @ForeignKey(name = "fk_checklist_item_assignee"))
    private User assignedTo;
}
