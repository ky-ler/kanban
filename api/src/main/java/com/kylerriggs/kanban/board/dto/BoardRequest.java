package com.kylerriggs.kanban.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.lang.NonNull;

public record BoardRequest(
        @NonNull
                @NotBlank(message = "Board name cannot be blank")
                @Size(
                        min = 3,
                        max = 100,
                        message = "Board name must be between 3 and 100 characters")
                String name,
        String description,
        boolean isArchived) {}
