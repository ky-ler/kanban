package com.kylerriggs.velora.exception;

public record ErrorResponse(
        long timestamp, int status, String error, String code, String message, String path) {}
