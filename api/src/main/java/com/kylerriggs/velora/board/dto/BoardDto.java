package com.kylerriggs.velora.board.dto;

import com.kylerriggs.velora.column.dto.ColumnDto;
import com.kylerriggs.velora.task.dto.TaskSummaryDto;
import com.kylerriggs.velora.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BoardDto(
        @NotNull UUID id,
        @NotBlank String name,
        String description,
        @NotNull UserSummaryDto createdBy,
        @NotNull CollaboratorDto[] collaborators,
        TaskSummaryDto[] tasks,
        ColumnDto[] columns,
        @NotNull boolean isArchived,
        @NotBlank String dateCreated,
        @NotBlank String dateModified,
        @NotNull boolean isFavorite) {}
