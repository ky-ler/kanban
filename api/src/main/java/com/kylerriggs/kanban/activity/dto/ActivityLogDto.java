package com.kylerriggs.kanban.activity.dto;

import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ActivityLogDto(
        @NotNull UUID id,
        @NotBlank String type,
        String details,
        @NotNull UUID taskId,
        @NotNull UserSummaryDto user,
        @NotBlank String dateCreated) {}
