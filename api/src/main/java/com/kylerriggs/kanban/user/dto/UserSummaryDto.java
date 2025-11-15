package com.kylerriggs.kanban.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UserSummaryDto(
        @NotBlank String id, @NotBlank String username, @NotBlank String profileImageUrl) {}
