package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.label.Label;
import com.kylerriggs.kanban.user.User;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Size;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import org.springframework.data.annotation.CreatedBy;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(
        name = "tasks",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_task_column_position",
                    columnNames = {"column_id", "position"})
        })
public class Task extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @jakarta.persistence.Column(nullable = false, columnDefinition = "TEXT")
    @Size(min = 3, max = 255)
    private String title;

    @jakarta.persistence.Column(columnDefinition = "TEXT", length = 2048)
    private String description;

    @jakarta.persistence.Column(name = "position", nullable = false)
    private Long position;

    private Long restorePosition;

    @lombok.Builder.Default private boolean isCompleted = false;

    @lombok.Builder.Default private boolean isArchived = false;

    @Enumerated(EnumType.STRING)
    @jakarta.persistence.Column(length = 10)
    private Priority priority;

    private LocalDate dueDate;

    @ManyToOne(optional = false)
    @JoinColumn(name = "board_id", foreignKey = @ForeignKey(name = "fk_task_board"))
    private Board board;

    @CreatedBy
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_id", foreignKey = @ForeignKey(name = "fk_task_creator"))
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "assigned_to_id", foreignKey = @ForeignKey(name = "fk_task_assignee"))
    private User assignedTo;

    @ManyToOne(optional = false)
    @JoinColumn(name = "column_id", foreignKey = @ForeignKey(name = "fk_task_column"))
    private Column column;

    @ManyToMany
    @JoinTable(
            name = "task_labels",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id"))
    @lombok.Builder.Default
    private Set<Label> labels = new LinkedHashSet<>();
}
