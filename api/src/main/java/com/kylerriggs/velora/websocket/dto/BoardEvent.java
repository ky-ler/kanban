package com.kylerriggs.velora.websocket.dto;

import java.util.UUID;

/**
 * Event DTO for WebSocket to broadcast board changes to connected clients. Events are sent when
 * tasks or boards are created, updated, moved, or deleted.
 */
public record BoardEvent(BoardEventType type, UUID boardId, UUID entityId, String details) {}
