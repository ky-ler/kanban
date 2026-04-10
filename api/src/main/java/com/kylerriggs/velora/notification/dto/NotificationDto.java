package com.kylerriggs.velora.notification.dto;

import com.kylerriggs.velora.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record NotificationDto(
        @NotNull UUID id,
        @NotBlank String type,
        @NotBlank String message,
        boolean isRead,
        @NotNull UserSummaryDto actor,
        @NotNull UUID taskId,
        @NotBlank String taskTitle,
        @NotNull UUID boardId,
        @NotBlank String boardName,
        @NotBlank String dateCreated) {}
