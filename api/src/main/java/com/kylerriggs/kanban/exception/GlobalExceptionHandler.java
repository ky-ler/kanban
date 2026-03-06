package com.kylerriggs.kanban.exception;

import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final ErrorResponseFactory errorResponseFactory;

    public GlobalExceptionHandler(ErrorResponseFactory errorResponseFactory) {
        this.errorResponseFactory = errorResponseFactory;
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", ex.getMessage(), request);
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BoardLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleBoardLimitExceededException(
            BoardLimitExceededException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.CONFLICT, "BOARD_LIMIT_EXCEEDED", ex.getMessage(), request);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(BoardAccessException.class)
    public ResponseEntity<ErrorResponse> handleBoardAccessException(
            BoardAccessException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), request);
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", ex.getMessage(), request);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbiddenException(
            ForbiddenException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), request);
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAuthorizationDeniedException(
            AuthorizationDeniedException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.FORBIDDEN,
                        "FORBIDDEN",
                        "You are not authorized to access this resource.",
                        request);
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex, WebRequest request) {
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
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
                errorResponseFactory.createValidation(
                        "VALIDATION_FAILED",
                        "One or more fields failed validation",
                        fieldErrors,
                        request);
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
                errorResponseFactory.createValidation(
                        "VALIDATION_FAILED",
                        "One or more constraints were violated",
                        fieldErrors,
                        request);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException ex, WebRequest request) {
        log.debug("Malformed JSON request: {}", ex.getMessage());
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.BAD_REQUEST,
                        "MALFORMED_REQUEST",
                        "Malformed request body",
                        request);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException ex, WebRequest request) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.CONFLICT,
                        "DATA_CONFLICT",
                        "The operation could not be completed due to a data conflict",
                        request);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLockingFailureException(
            ObjectOptimisticLockingFailureException ex, WebRequest request) {
        log.info("Optimistic locking failure: {}", ex.getMessage());
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.CONFLICT,
                        "OPTIMISTIC_LOCK_FAILED",
                        "The resource was modified by another request. Please retry.",
                        request);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, WebRequest request) {
        log.error("Unexpected error occurred", ex);
        ErrorResponse response =
                errorResponseFactory.create(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "INTERNAL_ERROR",
                        "An unexpected error occurred",
                        request);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
