package com.kylerriggs.kanban.label;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.task.Task;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(name = "labels")
public class Label extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    @NotBlank
    @Size(min = 1, max = 50)
    private String name;

    @Column(nullable = false, length = 20)
    @NotBlank
    @Size(min = 1, max = 20)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "board_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_label_board"))
    private Board board;

    @ManyToMany(mappedBy = "labels")
    @Builder.Default
    private Set<Task> tasks = new LinkedHashSet<>();
}
