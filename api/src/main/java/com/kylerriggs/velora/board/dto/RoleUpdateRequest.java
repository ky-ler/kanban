package com.kylerriggs.velora.board.dto;

import com.kylerriggs.velora.board.BoardRole;

import jakarta.validation.constraints.NotNull;

import org.springframework.lang.NonNull;

public record RoleUpdateRequest(
        @NonNull @NotNull(message = "A new role must be provided") BoardRole newRole) {}
