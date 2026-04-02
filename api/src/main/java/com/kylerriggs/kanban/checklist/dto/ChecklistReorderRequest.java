package com.kylerriggs.kanban.checklist.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ChecklistReorderRequest(@NotNull @Min(0) Long newPosition) {}
