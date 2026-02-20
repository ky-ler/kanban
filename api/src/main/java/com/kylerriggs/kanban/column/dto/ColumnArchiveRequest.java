package com.kylerriggs.kanban.column.dto;

import jakarta.validation.constraints.NotNull;

public record ColumnArchiveRequest(@NotNull Boolean isArchived, boolean confirmArchiveTasks) {}
