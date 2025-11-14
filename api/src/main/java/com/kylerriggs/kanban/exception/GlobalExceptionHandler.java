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
    public ResponseEntity<Object> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        Map<String, Object> body = Map.of(
                "timestamp", System.currentTimeMillis(),
                "column", HttpStatus.NOT_FOUND.value(),
                "error", "Not Found",
                "message", ex.getMessage()
        );
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BoardLimitExceededException.class)
    public ResponseEntity<Object> handleBoardLimitExceededException(
            BoardLimitExceededException ex, WebRequest request
    ) {
        Map<String, Object> body = Map.of(
                "timestamp", System.currentTimeMillis(),
                "column", HttpStatus.FORBIDDEN.value(),
                "error", "Board Limit Exceeded",
                "message", ex.getMessage()
        );
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }
}