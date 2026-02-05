package com.kylerriggs.kanban.websocket;

import static org.mockito.Mockito.verify;

import com.kylerriggs.kanban.websocket.dto.BoardEvent;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Objects;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class WebSocketEventServiceTest {

    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private WebSocketEventService webSocketEventService;

    @Test
    void broadcast_SendsEventToTopid() {
        UUID boardId = UUID.randomUUID();
        BoardEvent event = new BoardEvent("TEST", boardId, UUID.randomUUID(), null);

        webSocketEventService.broadcast(Objects.requireNonNull(boardId), event);

        verify(messagingTemplate).convertAndSend("/topic/boards/" + boardId, event);
    }
}
