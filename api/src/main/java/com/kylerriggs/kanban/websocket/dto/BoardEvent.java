package com.kylerriggs.kanban.websocket.dto;

import java.util.UUID;

/**
 * Event DTO for WebSocket to broadcast board changes to connected clients. Events are sent when
 * tasks or boards are created, updated, moved, or deleted.
 */
public record BoardEvent(
        String type, // Event type: TASK_CREATED, TASK_UPDATED, TASK_MOVED, TASK_DELETED,
        // BOARD_UPDATED, CONNECTED
        UUID boardId, // ID of the board affected by this event
        UUID entityId, // ID of the entity (task/board) that was modified
        String details // Optional: JSON string with additional context
        ) {}
