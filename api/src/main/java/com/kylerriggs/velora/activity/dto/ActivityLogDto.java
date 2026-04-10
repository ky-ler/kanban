package com.kylerriggs.velora.activity.dto;

import com.kylerriggs.velora.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ActivityLogDto(
        @NotNull UUID id,
        @NotBlank String type,
        String details,
        UUID taskId,
        String taskTitle,
        @NotNull UserSummaryDto user,
        @NotBlank String dateCreated) {}
