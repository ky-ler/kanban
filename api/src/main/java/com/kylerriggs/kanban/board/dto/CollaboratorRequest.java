package com.kylerriggs.kanban.board.dto;

import com.kylerriggs.kanban.board.BoardRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CollaboratorRequest(
        @NotBlank(message = "User ID cannot be blank")
        String userId,

        @NotNull(message = "Role must be provided")
        BoardRole role
) {
}

