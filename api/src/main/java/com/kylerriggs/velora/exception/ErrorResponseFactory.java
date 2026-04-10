package com.kylerriggs.velora.exception;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.WebRequest;

import java.util.Map;

@Component
public class ErrorResponseFactory {

    public ErrorResponse create(
            HttpStatus status, String code, String message, WebRequest request) {
        return new ErrorResponse(
                System.currentTimeMillis(),
                status.value(),
                status.getReasonPhrase(),
                code,
                message,
                extractPath(request));
    }

    public ValidationErrorResponse createValidation(
            String code, String message, Map<String, String> fieldErrors, WebRequest request) {
        return new ValidationErrorResponse(
                System.currentTimeMillis(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                code,
                message,
                extractPath(request),
                fieldErrors);
    }

    public String extractPath(WebRequest request) {
        String description = request.getDescription(false);
        return description.startsWith("uri=") ? description.substring(4) : description;
    }
}
