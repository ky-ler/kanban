package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.user.User;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;

import lombok.*;
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
// @JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
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
    private Integer position;

    @Builder.Default private boolean isCompleted = false;

    @Builder.Default private boolean isArchived = false;

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
}
