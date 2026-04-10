package com.kylerriggs.velora.checklist.dto;

import com.kylerriggs.velora.user.dto.UserSummaryDto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record ChecklistItemDto(
        @NotNull UUID id,
        @NotNull UUID taskId,
        @NotBlank String title,
        @NotNull boolean isCompleted,
        UserSummaryDto assignedTo,
        LocalDate dueDate,
        @Min(0) long position,
        @NotBlank String dateCreated,
        String dateModified) {}
