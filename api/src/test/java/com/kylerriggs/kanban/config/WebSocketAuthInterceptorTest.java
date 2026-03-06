package com.kylerriggs.kanban.config;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kylerriggs.kanban.board.BoardAccess;
import com.kylerriggs.kanban.exception.ForbiddenException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    @Mock private JwtDecoder jwtDecoder;
    @Mock private BoardAccess boardAccess;
    @Mock private MessageChannel messageChannel;

    @InjectMocks private WebSocketAuthInterceptor interceptor;

    @Test
    void preSend_WithConnectCommand_AuthenticatesUser() {
        // Given
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer token-123");
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Jwt jwt =
                new Jwt(
                        "token-123",
                        Instant.now(),
                        Instant.now().plusSeconds(300),
                        Map.of("alg", "none"),
                        Map.of("sub", "auth0|user123"));
        when(jwtDecoder.decode("token-123")).thenReturn(jwt);

        // When
        Message<?> result = interceptor.preSend(message, messageChannel);
        StompHeaderAccessor resultAccessor =
                MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);

        // Then
        assertNotNull(resultAccessor);
        assertNotNull(resultAccessor.getUser());
        assertTrue(resultAccessor.getUser() instanceof Authentication);
        assertTrue(((Authentication) resultAccessor.getUser()).isAuthenticated());
    }

    @Test
    void preSend_WithStompCommand_AuthenticatesUser() {
        // Given
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.STOMP);
        accessor.setNativeHeader("Authorization", "Bearer token-123");
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        Jwt jwt =
                new Jwt(
                        "token-123",
                        Instant.now(),
                        Instant.now().plusSeconds(300),
                        Map.of("alg", "none"),
                        Map.of("sub", "auth0|user123"));
        when(jwtDecoder.decode("token-123")).thenReturn(jwt);

        // When
        Message<?> result = interceptor.preSend(message, messageChannel);
        StompHeaderAccessor resultAccessor =
                MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);

        // Then
        assertNotNull(resultAccessor);
        assertNotNull(resultAccessor.getUser());
        assertTrue(resultAccessor.getUser() instanceof Authentication);
        assertTrue(((Authentication) resultAccessor.getUser()).isAuthenticated());
    }

    @Test
    void preSend_WithConnectCommandWithoutAuthorizationHeader_Throws() {
        // Given
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // When / Then
        assertThrows(
                IllegalArgumentException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void preSend_WithBoardSubscription_ValidatesCollaboratorAccess() {
        // Given
        UUID boardId = UUID.randomUUID();
        TestingAuthenticationToken authentication =
                new TestingAuthenticationToken("auth0|user123", null);
        authentication.setAuthenticated(true);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/boards/" + boardId);
        accessor.setUser(authentication);
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        when(boardAccess.isCollaborator("auth0|user123", boardId)).thenReturn(true);

        // When
        interceptor.preSend(message, messageChannel);

        // Then
        verify(boardAccess).isCollaborator("auth0|user123", boardId);
    }

    @Test
    void preSend_WithBoardSubscriptionUsingAuthorizationHeader_ValidatesAccess() {
        // Given
        UUID boardId = UUID.randomUUID();
        Jwt jwt =
                new Jwt(
                        "token-123",
                        Instant.now(),
                        Instant.now().plusSeconds(300),
                        Map.of("alg", "none"),
                        Map.of("sub", "auth0|user123"));
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/boards/" + boardId);
        accessor.setNativeHeader("Authorization", "Bearer token-123");
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtDecoder.decode("token-123")).thenReturn(jwt);
        when(boardAccess.isCollaborator("auth0|user123", boardId)).thenReturn(true);

        // When
        Message<?> result = interceptor.preSend(message, messageChannel);
        StompHeaderAccessor resultAccessor =
                MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);

        // Then
        assertNotNull(resultAccessor);
        assertNotNull(resultAccessor.getUser());
        verify(boardAccess).isCollaborator("auth0|user123", boardId);
    }

    @Test
    void preSend_WithBoardSubscriptionWithoutAuthenticatedUser_Throws() {
        // Given
        UUID boardId = UUID.randomUUID();
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/boards/" + boardId);
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // When / Then
        assertThrows(
                AccessDeniedException.class, () -> interceptor.preSend(message, messageChannel));
    }

    @Test
    void preSend_WithBoardSubscriptionWithoutCollaboratorAccess_ThrowsAccessDenied() {
        // Given
        UUID boardId = UUID.randomUUID();
        TestingAuthenticationToken authentication =
                new TestingAuthenticationToken("auth0|user123", null);
        authentication.setAuthenticated(true);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/boards/" + boardId);
        accessor.setUser(authentication);
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        when(boardAccess.isCollaborator("auth0|user123", boardId))
                .thenThrow(new ForbiddenException("Not a collaborator on this board"));

        // When
        AccessDeniedException exception =
                assertThrows(
                        AccessDeniedException.class,
                        () -> interceptor.preSend(message, messageChannel));

        // Then
        assertTrue(exception.getMessage().contains("BOARD_ACCESS_DENIED"));
    }

    @Test
    void preSend_WithInvalidBoardDestination_Throws() {
        // Given
        TestingAuthenticationToken authentication =
                new TestingAuthenticationToken("auth0|user123", null);
        authentication.setAuthenticated(true);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/boards/not-a-uuid");
        accessor.setUser(authentication);
        accessor.setLeaveMutable(true);
        Message<byte[]> message =
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // When / Then
        assertThrows(
                IllegalArgumentException.class, () -> interceptor.preSend(message, messageChannel));
    }
}
