package com.kylerriggs.kanban.label.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LabelDto(
        @NotNull UUID id,
        @NotBlank String name,
        @NotBlank String color,
        @NotNull UUID boardId,
        @NotBlank String dateCreated,
        @NotBlank String dateModified) {}
