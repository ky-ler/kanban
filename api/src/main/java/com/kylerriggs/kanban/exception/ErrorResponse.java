package com.kylerriggs.kanban.exception;

public record ErrorResponse(
        long timestamp, int status, String error, String code, String message, String path) {}
