package com.kylerriggs.kanban.column.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ColumnDto(
        @NotNull UUID id,
        @NotBlank String name,
        @NotNull @Min(0) int position,
        @NotNull boolean isArchived) {}
