package com.kylerriggs.kanban.websocket;

import com.kylerriggs.kanban.websocket.dto.BoardEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service for broadcasting board events via WebSocket. Replaces SseService to avoid connection leak
 * issues with long-lived connections.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventService {
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcasts a board event to all subscribers of the board's topic.
     *
     * @param boardId the board ID to broadcast to
     * @param event the event to broadcast
     */
    public void broadcast(@NonNull UUID boardId, @NonNull BoardEvent event) {
        String destination = "/topic/boards/" + boardId;
        log.info("WebSocket broadcasting: {} to {}", event.type(), destination);
        messagingTemplate.convertAndSend(destination, event);
        log.info("WebSocket broadcast complete for: {}", event.type());
    }
}
