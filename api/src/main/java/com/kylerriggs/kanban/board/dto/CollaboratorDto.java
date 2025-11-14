package com.kylerriggs.kanban.board.dto;

import com.kylerriggs.kanban.board.BoardRole;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

public record CollaboratorDto(UserSummaryDto user, BoardRole role) {
}
