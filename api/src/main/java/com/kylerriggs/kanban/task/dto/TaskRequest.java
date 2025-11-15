package com.kylerriggs.kanban.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record TaskRequest(
        @NonNull @NotNull(message = "Board ID cannot be null") UUID boardId,
        String assigneeId,
        @NonNull
                @NotBlank(message = "Title cannot be blank")
                @Size(min = 3, max = 255, message = "Title must be between 3 and 255 characters")
                String title,
        String description,
        @NonNull @NotNull(message = "Column ID cannot be null") UUID columnId,
        boolean isCompleted,

        boolean isArchived
) {
}
