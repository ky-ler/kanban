package com.kylerriggs.kanban.invite;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.user.User;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(name = "board_invites")
public class BoardInvite extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 12)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "board_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_invite_board"))
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "created_by_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_invite_creator"))
    private User createdBy;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "use_count", nullable = false)
    @Builder.Default
    private Integer useCount = 0;

    @Column(name = "is_revoked", nullable = false)
    @Builder.Default
    private boolean revoked = false;
}
