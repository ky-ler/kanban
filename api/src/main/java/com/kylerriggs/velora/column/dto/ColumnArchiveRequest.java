package com.kylerriggs.velora.column.dto;

import jakarta.validation.constraints.NotNull;

public record ColumnArchiveRequest(@NotNull Boolean isArchived, boolean confirmArchiveTasks) {}
