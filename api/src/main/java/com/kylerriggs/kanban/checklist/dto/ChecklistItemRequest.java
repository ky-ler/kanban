package com.kylerriggs.kanban.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ChecklistItemRequest(
        @NotBlank @Size(min = 1, max = 500) String title,
        Boolean isCompleted,
        String assigneeId,
        LocalDate dueDate) {}
