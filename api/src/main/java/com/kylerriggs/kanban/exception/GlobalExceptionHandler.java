package com.kylerriggs.kanban.exception;

import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.NOT_FOUND.value(),
                        "Not Found",
                        ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BoardLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleBoardLimitExceededException(
            BoardLimitExceededException ex, WebRequest request) {
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.FORBIDDEN.value(),
                        "Board Limit Exceeded",
                        ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BoardAccessException.class)
    public ResponseEntity<ErrorResponse> handleBoardAccessException(
            BoardAccessException ex, WebRequest request) {
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.FORBIDDEN.value(),
                        "Forbidden",
                        ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex, WebRequest request) {
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.UNAUTHORIZED.value(),
                        "Unauthorized",
                        ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbiddenException(
            ForbiddenException ex, WebRequest request) {
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.FORBIDDEN.value(),
                        "Forbidden",
                        ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex, WebRequest request) {
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.BAD_REQUEST.value(),
                        "Bad Request",
                        ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error -> fieldErrors.put(error.getField(), error.getDefaultMessage()));

        ValidationErrorResponse response =
                new ValidationErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.BAD_REQUEST.value(),
                        "Validation Failed",
                        "One or more fields failed validation",
                        fieldErrors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ValidationErrorResponse> handleConstraintViolationException(
            ConstraintViolationException ex, WebRequest request) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getConstraintViolations()
                .forEach(
                        violation ->
                                fieldErrors.put(
                                        violation.getPropertyPath().toString(),
                                        violation.getMessage()));

        ValidationErrorResponse response =
                new ValidationErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.BAD_REQUEST.value(),
                        "Validation Failed",
                        "One or more constraints were violated",
                        fieldErrors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException ex, WebRequest request) {
        log.debug("Malformed JSON request: {}", ex.getMessage());
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.BAD_REQUEST.value(),
                        "Bad Request",
                        "Malformed request body");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex, WebRequest request) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.CONFLICT.value(),
                        "Conflict",
                        "The operation could not be completed due to a data conflict");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLockingFailureException(
            ObjectOptimisticLockingFailureException ex, WebRequest request) {
        log.info("Optimistic locking failure: {}", ex.getMessage());
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.CONFLICT.value(),
                        "Conflict",
                        "The resource was modified by another request. Please retry.");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, WebRequest request) {
        log.error("Unexpected error occurred", ex);
        ErrorResponse response =
                new ErrorResponse(
                        System.currentTimeMillis(),
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        "Internal Server Error",
                        "An unexpected error occurred");
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
