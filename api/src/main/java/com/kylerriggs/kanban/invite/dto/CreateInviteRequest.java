package com.kylerriggs.kanban.invite.dto;

import jakarta.validation.constraints.NotNull;

import org.springframework.lang.NonNull;

import java.util.UUID;

public record CreateInviteRequest(
        @NonNull @NotNull(message = "Board ID cannot be null") UUID boardId,
        @NonNull @NotNull(message = "Expiration type is required") InviteExpiration expiration,
        @NonNull @NotNull(message = "Max uses is required") InviteMaxUses maxUses) {}
