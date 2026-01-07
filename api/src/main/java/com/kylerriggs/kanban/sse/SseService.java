package com.kylerriggs.kanban.sse;

import com.kylerriggs.kanban.sse.dto.BoardEvent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service for managing Server-Sent Events (SSE) connections for real-time board updates. Maintains
 * a registry of active connections per board and broadcasts events to subscribers.
 */
@Service
public class SseService {
    private static final Logger logger = LoggerFactory.getLogger(SseService.class);
    private static final long TIMEOUT = 1800000L; // 30 minutes

    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * Subscribe a client to board events.
     *
     * @param boardId The board to subscribe to
     * @return SseEmitter for the connection
     */
    public SseEmitter subscribe(UUID boardId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);

        emitters.computeIfAbsent(boardId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        logger.debug("Client subscribed to board: {}", boardId);

        emitter.onCompletion(() -> removeEmitter(boardId, emitter));
        emitter.onTimeout(() -> removeEmitter(boardId, emitter));
        emitter.onError(
                (e) -> {
                    logger.error("SSE error for board {}: {}", boardId, e.getMessage());
                    removeEmitter(boardId, emitter);
                });

        // Send initial connection confirmation
        try {
            emitter.send(
                    SseEmitter.event().name("CONNECTED").data("Connected to board " + boardId));
        } catch (IOException e) {
            logger.error("Failed to send connection event", e);
            removeEmitter(boardId, emitter);
        }

        return emitter;
    }

    /**
     * Broadcast an event to all clients subscribed to a board.
     *
     * @param boardId The board to broadcast to
     * @param event The event to send
     */
    public void broadcast(UUID boardId, BoardEvent event) {
        List<SseEmitter> boardEmitters = emitters.get(boardId);
        if (boardEmitters == null || boardEmitters.isEmpty()) {
            return;
        }

        logger.debug(
                "Broadcasting {} to {} clients on board {}",
                event.type(),
                boardEmitters.size(),
                boardId);

        for (SseEmitter emitter : boardEmitters) {
            try {
                emitter.send(SseEmitter.event().name(event.type()).data(event));
            } catch (IOException e) {
                logger.warn("Failed to send event to client, removing emitter", e);
                removeEmitter(boardId, emitter);
            }
        }
    }

    /**
     * Send heartbeat to all active connections to prevent timeout. Should be called by a scheduled
     * task every 15-30 seconds.
     */
    public void sendHeartbeat() {
        emitters.forEach(
                (boardId, emitterList) -> {
                    for (SseEmitter emitter : emitterList) {
                        try {
                            emitter.send(SseEmitter.event().comment("heartbeat"));
                        } catch (IOException e) {
                            removeEmitter(boardId, emitter);
                        }
                    }
                });
    }

    private void removeEmitter(UUID boardId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(boardId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(boardId);
            }
            logger.debug("Client unsubscribed from board: {}", boardId);
        }
    }

    /** Get the count of active subscribers for a board (for monitoring/debugging). */
    public int getSubscriberCount(UUID boardId) {
        List<SseEmitter> list = emitters.get(boardId);
        return list != null ? list.size() : 0;
    }
}
