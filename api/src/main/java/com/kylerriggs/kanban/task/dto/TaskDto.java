package com.kylerriggs.kanban.task.dto;

import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TaskDto(
        @NotNull
        UUID id,
        @NotNull
        UserSummaryDto createdBy,
        UserSummaryDto assignedTo,
        @NotBlank
        String title,
        String description,
        @NotNull
        UUID columnId,
        @NotNull
        @Min(0)
        Integer position,
        @NotNull
        boolean isCompleted,
        @NotNull
        boolean isArchived,
        @NotBlank
        String dateCreated,
        @NotBlank
        String dateModified
) {
}
