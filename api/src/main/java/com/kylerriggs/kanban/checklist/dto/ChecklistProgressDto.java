package com.kylerriggs.kanban.checklist.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ChecklistProgressDto(@NotNull @Min(0) int total, @NotNull @Min(0) int completed) {}
