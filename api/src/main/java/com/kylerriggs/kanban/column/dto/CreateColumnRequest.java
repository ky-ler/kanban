package com.kylerriggs.kanban.column.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateColumnRequest(
        @NotBlank(message = "Column name cannot be blank")
                @Size(
                        min = 1,
                        max = 100,
                        message = "Column name must be between 1 and 100 characters")
                String name,
        @Min(value = 0, message = "Position must be >= 0") Integer position) {}
