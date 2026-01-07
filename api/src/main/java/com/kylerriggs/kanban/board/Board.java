package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.user.User;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;

import lombok.*;
import lombok.experimental.SuperBuilder;

import org.springframework.data.annotation.CreatedBy;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(name = "boards")
public class Board extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @jakarta.persistence.Column(nullable = false, columnDefinition = "TEXT")
    @Size(min = 3, max = 100)
    private String name;

    @jakarta.persistence.Column(columnDefinition = "TEXT", length = 2048)
    private String description;

    @Builder.Default private boolean isArchived = false;

    @CreatedBy
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_id", foreignKey = @ForeignKey(name = "fk_board_creator"))
    private User createdBy;

    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private Set<Task> tasks = new LinkedHashSet<>();

    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<BoardUser> collaborators = new LinkedHashSet<>();

    @OneToMany(mappedBy = "board", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    @Builder.Default
    private Set<Column> columns = new LinkedHashSet<>();
}
