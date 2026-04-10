package com.kylerriggs.velora.comment.dto;

import com.kylerriggs.velora.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CommentDto(
        @NotNull UUID id,
        @NotBlank String content,
        @NotNull UserSummaryDto author,
        @NotNull UUID taskId,
        @NotBlank String dateCreated,
        String dateModified) {}
