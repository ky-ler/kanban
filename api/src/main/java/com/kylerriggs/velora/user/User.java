package com.kylerriggs.velora.user;

import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.board.BoardUser;
import com.kylerriggs.velora.common.BaseEntity;
import com.kylerriggs.velora.task.Task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
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

    @Column(nullable = false)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, name = "profile_image_url")
    private String profileImageUrl;

    @OneToMany(mappedBy = "createdBy")
    @lombok.Builder.Default
    private Set<Board> boardsCreated = new HashSet<>();

    @OneToMany(mappedBy = "createdBy")
    @lombok.Builder.Default
    private Set<Task> tasksCreated = new HashSet<>();

    @OneToMany(mappedBy = "assignedTo")
    @lombok.Builder.Default
    private Set<Task> tasksAssigned = new HashSet<>();

    @OneToMany(mappedBy = "user")
    @lombok.Builder.Default
    private Set<BoardUser> boardMemberships = new HashSet<>();
}
