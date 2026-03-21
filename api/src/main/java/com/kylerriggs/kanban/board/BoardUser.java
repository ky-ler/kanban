package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(name = "board_users")
@IdClass(BoardUserId.class)
public class BoardUser extends BaseEntity {
    @Id
    @ManyToOne
    @JoinColumn(name = "board_id", foreignKey = @ForeignKey(name = "fk_pu_board"))
    private Board board;

    @Id
    @ManyToOne
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_pu_user"))
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private BoardRole role;

    @Column(name = "is_favorite", nullable = false)
    @lombok.Builder.Default
    private boolean isFavorite = false;
}
