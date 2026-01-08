package com.kylerriggs.kanban.websocket;

import static org.mockito.Mockito.verify;

import com.kylerriggs.kanban.websocket.dto.BoardEvent;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class BoardEventListenerTest {

    @Mock private WebSocketEventService webSocketEventService;

    @InjectMocks private BoardEventListener boardEventListener;

    @Test
    void handleBoardEvent_BroadcastsEvent() {
        UUID boardId = UUID.randomUUID();
        BoardEvent event = new BoardEvent("TEST", boardId, UUID.randomUUID(), null);
        BoardEventPublisher.BoardEventWrapper wrapper =
                new BoardEventPublisher.BoardEventWrapper(event);

        boardEventListener.handleBoardEvent(wrapper);

        verify(webSocketEventService).broadcast(boardId, event);
    }
}
