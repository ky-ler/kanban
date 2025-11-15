package com.kylerriggs.kanban.task.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MoveTaskRequest(
        @NotNull(message = "New position cannot be null")
                @Min(value = 0, message = "Position must be >= 0")
                Integer newPosition,
        UUID newColumnId) {}
