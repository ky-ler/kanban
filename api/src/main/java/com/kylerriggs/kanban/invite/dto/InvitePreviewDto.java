package com.kylerriggs.kanban.invite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InvitePreviewDto(
        @NotBlank String boardName, @NotNull boolean valid, String errorMessage) {}
