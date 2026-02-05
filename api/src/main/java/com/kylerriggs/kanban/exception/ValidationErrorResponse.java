package com.kylerriggs.kanban.exception;

import java.util.Map;

public record ValidationErrorResponse(
        long timestamp,
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors) {}
