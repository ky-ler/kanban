package com.kylerriggs.kanban.comment.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentRequest(@NotBlank String content) {}
