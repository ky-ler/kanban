package com.kylerriggs.velora.board.dto;

import com.kylerriggs.velora.board.BoardRole;
import com.kylerriggs.velora.user.dto.UserSummaryDto;

public record CollaboratorDto(UserSummaryDto user, BoardRole role) {}
