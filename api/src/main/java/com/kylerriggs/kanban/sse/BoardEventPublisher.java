package com.kylerriggs.kanban.sse;

import com.kylerriggs.kanban.sse.dto.BoardEvent;

import lombok.RequiredArgsConstructor;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Publishes board events to be broadcast via SSE after transaction commits. Use this instead of
 * calling SseService.broadcast() directly from @Transactional methods to avoid race conditions
 * where clients refetch before the transaction commits.
 */
@Component
@RequiredArgsConstructor
public class BoardEventPublisher {
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Publishes a board event that will be broadcast via SSE after the current transaction commits.
     *
     * @param type The event type (TASK_CREATED, TASK_UPDATED, etc.)
     * @param boardId The board ID to broadcast to
     * @param entityId The ID of the entity that changed (can be null)
     */
    public void publish(String type, UUID boardId, UUID entityId) {
        BoardEvent event = new BoardEvent(type, boardId, entityId, null);
        eventPublisher.publishEvent(new BoardEventWrapper(event));
    }

    /** Wrapper class to distinguish our events from other application events. */
    public record BoardEventWrapper(BoardEvent event) {}
}
