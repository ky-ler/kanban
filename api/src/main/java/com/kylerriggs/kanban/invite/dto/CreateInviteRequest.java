package com.kylerriggs.kanban.invite.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateInviteRequest(
        @NotNull(message = "Board ID cannot be null") UUID boardId,
        @NotNull(message = "Expiration type is required") InviteExpiration expiration,
        @NotNull(message = "Max uses is required") InviteMaxUses maxUses) {}
