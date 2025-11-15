package com.kylerriggs.kanban.board.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BoardSummary(
        @NotNull UUID id,
        @NotBlank String name,
        String description,
        @NotNull String dateModified,
        @Min(0) @NotNull int completedTasks,
        @NotNull @Min(0) int totalTasks,
        @NotNull boolean isArchived,
        @NotNull boolean isDefault) {}
