package com.kylerriggs.kanban.board.dto;

import com.kylerriggs.kanban.board.BoardRole;
import jakarta.validation.constraints.NotNull;

public record RoleUpdateRequest(
        @NotNull(message = "A new role must be provided")
        BoardRole newRole
) {
}
