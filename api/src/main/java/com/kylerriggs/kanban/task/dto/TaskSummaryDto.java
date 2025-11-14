package com.kylerriggs.kanban.task.dto;

import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TaskSummaryDto(
        @NotNull
        UUID id,
        @NotBlank
        String title,
        @NotNull
        UUID columnId,
        UserSummaryDto assignedTo,
        @NotNull
        @Min(0)
        Integer position,
        @NotNull
        boolean isCompleted,
        @NotNull
        boolean isArchived
) {
}
