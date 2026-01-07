package com.kylerriggs.kanban.label.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LabelSummaryDto(@NotNull UUID id, @NotBlank String name, @NotBlank String color) {}
