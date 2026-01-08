package com.kylerriggs.kanban.invite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AcceptInviteResponse(
        @NotNull UUID boardId, @NotBlank String boardName, @NotNull boolean alreadyMember) {}
