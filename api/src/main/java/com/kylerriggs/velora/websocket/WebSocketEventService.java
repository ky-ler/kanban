package com.kylerriggs.velora.websocket;

import com.kylerriggs.velora.websocket.dto.BoardEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** Service for broadcasting board events via WebSocket. */
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
        log.debug("WebSocket broadcasting: {} to {}", event.type(), destination);
        messagingTemplate.convertAndSend(destination, event);
        log.debug("WebSocket broadcast complete for: {}", event.type());
    }
}
