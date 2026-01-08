package com.kylerriggs.kanban.invite.dto;

import jakarta.validation.constraints.NotNull;

public record InvitePreviewDto(String boardName, @NotNull boolean valid, String errorMessage) {}
