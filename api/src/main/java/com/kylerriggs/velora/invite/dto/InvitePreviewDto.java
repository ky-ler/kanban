package com.kylerriggs.velora.invite.dto;

import jakarta.validation.constraints.NotNull;

public record InvitePreviewDto(String boardName, @NotNull boolean valid, String errorMessage) {}
