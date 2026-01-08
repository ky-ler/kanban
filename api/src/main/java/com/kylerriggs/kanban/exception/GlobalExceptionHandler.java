package com.kylerriggs.kanban.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        Map<String, Object> body =
                Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "status", HttpStatus.NOT_FOUND.value(),
                        "error", "Not Found",
                        "message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BoardLimitExceededException.class)
    public ResponseEntity<Object> handleBoardLimitExceededException(
            BoardLimitExceededException ex, WebRequest request) {
        Map<String, Object> body =
                Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "status", HttpStatus.FORBIDDEN.value(),
                        "error", "Board Limit Exceeded",
                        "message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BoardAccessException.class)
    public ResponseEntity<Object> handleBoardAccessException(
            BoardAccessException ex, WebRequest request) {
        Map<String, Object> body =
                Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "status", HttpStatus.FORBIDDEN.value(),
                        "error", "Forbidden",
                        "message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Object> handleUnauthorizedException(
            UnauthorizedException ex, WebRequest request) {
        Map<String, Object> body =
                Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "status", HttpStatus.UNAUTHORIZED.value(),
                        "error", "Unauthorized",
                        "message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Object> handleForbiddenException(
            ForbiddenException ex, WebRequest request) {
        Map<String, Object> body =
                Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "status", HttpStatus.FORBIDDEN.value(),
                        "error", "Forbidden",
                        "message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Object> handleBadRequestException(
            BadRequestException ex, WebRequest request) {
        Map<String, Object> body =
                Map.of(
                        "timestamp", System.currentTimeMillis(),
                        "status", HttpStatus.BAD_REQUEST.value(),
                        "error", "Bad Request",
                        "message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }
}
