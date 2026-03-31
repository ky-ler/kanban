package com.kylerriggs.kanban.task.dto;

import com.kylerriggs.kanban.label.dto.LabelSummaryDto;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/**
 * DTO for the "My Tasks" view — includes board and column context so the client can display tasks
 * from multiple boards without extra lookups.
 */
public record MyTaskDto(
        @NotNull UUID id,
        @NotBlank String title,
        String description,
        String priority,
        String dueDate,
        @NotNull boolean isCompleted,
        @NotNull boolean isArchived,
        @NotNull UUID boardId,
        @NotBlank String boardName,
        @NotNull UUID columnId,
        @NotBlank String columnName,
        UserSummaryDto assignedTo,
        List<LabelSummaryDto> labels,
        @NotBlank String dateCreated,
        @NotBlank String dateModified) {}
