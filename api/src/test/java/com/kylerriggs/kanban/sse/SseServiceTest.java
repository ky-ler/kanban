package com.kylerriggs.kanban.sse;

import static org.junit.jupiter.api.Assertions.*;

import com.kylerriggs.kanban.sse.dto.BoardEvent;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

class SseServiceTest {

    private static final UUID BOARD_ID = UUID.randomUUID();
    private static final UUID OTHER_BOARD_ID = UUID.randomUUID();

    private SseService sseService;

    @BeforeEach
    void setUp() {
        sseService = new SseService();
    }

    @Nested
    class Subscribe {

        @Test
        void subscribe_ShouldReturnEmitterAndIncrementCount() {
            // When
            SseEmitter emitter = sseService.subscribe(BOARD_ID);

            // Then
            assertNotNull(emitter);
            assertEquals(1, sseService.getSubscriberCount(BOARD_ID));
        }

        @Test
        void subscribe_MultipleClients_ShouldIncrementCount() {
            // When
            sseService.subscribe(BOARD_ID);
            sseService.subscribe(BOARD_ID);
            sseService.subscribe(BOARD_ID);

            // Then
            assertEquals(3, sseService.getSubscriberCount(BOARD_ID));
        }

        @Test
        void subscribe_DifferentBoards_ShouldTrackSeparately() {
            // When
            sseService.subscribe(BOARD_ID);
            sseService.subscribe(BOARD_ID);
            sseService.subscribe(OTHER_BOARD_ID);

            // Then
            assertEquals(2, sseService.getSubscriberCount(BOARD_ID));
            assertEquals(1, sseService.getSubscriberCount(OTHER_BOARD_ID));
        }
    }

    @Nested
    class GetSubscriberCount {

        @Test
        void getSubscriberCount_WhenNoSubscribers_ReturnsZero() {
            // When
            int count = sseService.getSubscriberCount(BOARD_ID);

            // Then
            assertEquals(0, count);
        }

        @Test
        void getSubscriberCount_WithSubscribers_ReturnsCorrectCount() {
            // Given
            sseService.subscribe(BOARD_ID);
            sseService.subscribe(BOARD_ID);

            // When
            int count = sseService.getSubscriberCount(BOARD_ID);

            // Then
            assertEquals(2, count);
        }
    }

    @Nested
    class Broadcast {

        @Test
        void broadcast_WhenNoSubscribers_ShouldNotThrow() {
            // Given
            BoardEvent event = new BoardEvent("TASK_CREATED", BOARD_ID, UUID.randomUUID(), null);

            // When & Then - should not throw
            assertDoesNotThrow(() -> sseService.broadcast(BOARD_ID, event));
        }

        @Test
        void broadcast_WithSubscribers_ShouldNotThrow() {
            // Given
            sseService.subscribe(BOARD_ID);
            BoardEvent event =
                    new BoardEvent("TASK_UPDATED", BOARD_ID, UUID.randomUUID(), "details");

            // When & Then - should not throw (actual send may fail without HTTP context)
            assertDoesNotThrow(() -> sseService.broadcast(BOARD_ID, event));
        }
    }

    @Nested
    class SendHeartbeat {

        @Test
        void sendHeartbeat_WhenNoSubscribers_ShouldNotThrow() {
            // When & Then
            assertDoesNotThrow(() -> sseService.sendHeartbeat());
        }

        @Test
        void sendHeartbeat_WithSubscribers_ShouldNotThrow() {
            // Given
            sseService.subscribe(BOARD_ID);
            sseService.subscribe(OTHER_BOARD_ID);

            // When & Then
            assertDoesNotThrow(() -> sseService.sendHeartbeat());
        }
    }
}
