package com.kylerriggs.kanban.board.dto;

import jakarta.validation.constraints.NotNull;

public record BoardArchiveRequest(@NotNull Boolean isArchived, boolean confirmArchiveTasks) {}
