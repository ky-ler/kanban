package com.kylerriggs.kanban.label.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.lang.NonNull;

import java.util.UUID;

public record LabelRequest(
        @NonNull @NotNull(message = "Board ID cannot be null") UUID boardId,
        @NonNull
                @NotBlank(message = "Name cannot be blank")
                @Size(min = 1, max = 50, message = "Name must be between 1 and 50 characters")
                String name,
        @NonNull
                @NotBlank(message = "Color cannot be blank")
                @Size(min = 1, max = 20, message = "Color must be between 1 and 20 characters")
                String color) {}
