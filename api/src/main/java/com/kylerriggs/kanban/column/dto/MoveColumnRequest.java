package com.kylerriggs.kanban.column.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record MoveColumnRequest(
        @NotNull(message = "New position cannot be null")
                @Min(value = 0, message = "Position must be >= 0")
                Integer newPosition) {}
