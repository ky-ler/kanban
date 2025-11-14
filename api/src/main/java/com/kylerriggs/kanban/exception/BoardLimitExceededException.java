package com.kylerriggs.kanban.exception;

public class BoardLimitExceededException extends RuntimeException {
    public BoardLimitExceededException(String message) {
        super(message);
    }
}

