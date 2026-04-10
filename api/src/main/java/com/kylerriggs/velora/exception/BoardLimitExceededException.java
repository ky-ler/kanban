package com.kylerriggs.velora.exception;

public class BoardLimitExceededException extends RuntimeException {
    public BoardLimitExceededException(String message) {
        super(message);
    }
}
