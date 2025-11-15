package com.kylerriggs.kanban.board.dto;

import com.kylerriggs.kanban.board.BoardRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.lang.NonNull;

public record CollaboratorRequest(
        @NonNull @NotBlank(message = "User ID cannot be blank") String userId,
        @NonNull @NotNull(message = "Role must be provided") BoardRole role) {}
