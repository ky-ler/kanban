package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardUser;
import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.task.Task;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Id private String id;

    @Column(nullable = false, length = 15, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, name = "profile_image_url")
    private String profileImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_board_id")
    private Board defaultBoard;

    @OneToMany(mappedBy = "createdBy")
    @Builder.Default
    private Set<Board> boardsCreated = new HashSet<>();

    @OneToMany(mappedBy = "createdBy")
    @Builder.Default
    private Set<Task> tasksCreated = new HashSet<>();

    @OneToMany(mappedBy = "assignedTo")
    @Builder.Default
    private Set<Task> tasksAssigned = new HashSet<>();

    @OneToMany(mappedBy = "user")
    @Builder.Default
    private Set<BoardUser> boardMemberships = new HashSet<>();
}
