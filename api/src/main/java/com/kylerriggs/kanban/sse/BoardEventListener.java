package com.kylerriggs.kanban.sse;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for board events and broadcasts them via SSE after the transaction commits. This ensures
 * clients don't refetch stale data due to race conditions.
 */
@Component
@RequiredArgsConstructor
public class BoardEventListener {
    private final SseService sseService;

    /**
     * Broadcasts the board event via SSE after the transaction successfully commits. If the
     * transaction rolls back, the event is not broadcast.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBoardEvent(BoardEventPublisher.BoardEventWrapper wrapper) {
        sseService.broadcast(wrapper.event().boardId(), wrapper.event());
    }
}
