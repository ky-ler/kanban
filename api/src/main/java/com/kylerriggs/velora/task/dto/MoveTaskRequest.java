package com.kylerriggs.velora.task.dto;

import java.util.UUID;

public record MoveTaskRequest(UUID afterTaskId, UUID beforeTaskId, UUID newColumnId) {}
