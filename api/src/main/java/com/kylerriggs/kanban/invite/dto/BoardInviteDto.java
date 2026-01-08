package com.kylerriggs.kanban.invite.dto;

import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BoardInviteDto(
        @NotNull UUID id,
        @NotBlank String code,
        @NotNull UUID boardId,
        @NotNull UserSummaryDto createdBy,
        String expiresAt,
        Integer maxUses,
        @NotNull Integer useCount,
        @NotNull boolean revoked,
        @NotBlank String dateCreated) {}
