package com.kylerriggs.kanban.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for board events and broadcasts them via WebSocket after the transaction commits. This
 * ensures clients don't refetch stale data due to race conditions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardEventListener {
    private final WebSocketEventService webSocketEventService;

    /**
     * Broadcasts the board event via WebSocket after the transaction successfully commits. If the
     * transaction rolls back, the event is not broadcast.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBoardEvent(BoardEventPublisher.BoardEventWrapper wrapper) {
        log.info(
                "Received event from publisher, broadcasting: type={}, boardId={}",
                wrapper.event().type(),
                wrapper.event().boardId());
        webSocketEventService.broadcast(wrapper.event().boardId(), wrapper.event());
    }
}
