package com.kylerriggs.kanban.websocket;

import com.kylerriggs.kanban.websocket.dto.BoardEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Publishes board events to be broadcast via WebSocket after transaction commits. Use this instead
 * of calling WebSocketEventService.broadcast() directly from @Transactional methods to avoid race
 * conditions where clients refetch before the transaction commits.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardEventPublisher {
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Publishes a board event that will be broadcast via WebSocket after the current transaction
     * commits.
     *
     * @param type The event type (TASK_CREATED, TASK_UPDATED, etc.)
     * @param boardId The board ID to broadcast to
     * @param entityId The ID of the entity that changed (can be null)
     */
    public void publish(String type, UUID boardId, UUID entityId) {
        log.info("Publishing event: type={}, boardId={}, entityId={}", type, boardId, entityId);
        BoardEvent event = new BoardEvent(type, boardId, entityId, null);
        eventPublisher.publishEvent(new BoardEventWrapper(event));
    }

    /** Wrapper class to distinguish our events from other application events. */
    public record BoardEventWrapper(BoardEvent event) {}
}
