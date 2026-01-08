package com.kylerriggs.kanban.invite;

import com.kylerriggs.kanban.invite.dto.BoardInviteDto;
import com.kylerriggs.kanban.invite.dto.InvitePreviewDto;
import com.kylerriggs.kanban.user.UserMapper;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class BoardInviteMapper {
    private final UserMapper userMapper;

    public BoardInviteDto toDto(BoardInvite invite) {
        return new BoardInviteDto(
                invite.getId(),
                invite.getCode(),
                invite.getBoard().getId(),
                userMapper.toSummaryDto(invite.getCreatedBy()),
                invite.getExpiresAt() != null ? invite.getExpiresAt().toString() : null,
                invite.getMaxUses(),
                invite.getUseCount(),
                invite.isRevoked(),
                invite.getDateCreated() != null ? invite.getDateCreated().toString() : null);
    }

    public InvitePreviewDto toPreviewDto(BoardInvite invite) {
        String error = validateInvite(invite);
        return new InvitePreviewDto(invite.getBoard().getName(), error == null, error);
    }

    private String validateInvite(BoardInvite invite) {
        if (invite.isRevoked()) {
            return "revoked";
        }
        if (invite.getExpiresAt() != null && Instant.now().isAfter(invite.getExpiresAt())) {
            return "expired";
        }
        if (invite.getMaxUses() != null && invite.getUseCount() >= invite.getMaxUses()) {
            return "max_uses_reached";
        }
        return null;
    }
}
