package com.kylerriggs.kanban.board.dto;

import com.kylerriggs.kanban.board.BoardRole;

import jakarta.validation.constraints.NotNull;

import org.springframework.lang.NonNull;

public record RoleUpdateRequest(
        @NonNull @NotNull(message = "A new role must be provided") BoardRole newRole) {}
