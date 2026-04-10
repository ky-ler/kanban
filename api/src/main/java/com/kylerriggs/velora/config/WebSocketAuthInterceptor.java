package com.kylerriggs.velora.config;

import com.kylerriggs.velora.board.BoardAccess;
import com.kylerriggs.velora.exception.ForbiddenException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

/**
 * Intercepts STOMP CONNECT frames to authenticate WebSocket connections via JWT. The JWT is
 * expected in the 'Authorization' header of the STOMP frame.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private static final String BOARD_TOPIC_PREFIX = "/topic/boards/";
    private static final String USER_TOPIC_PREFIX = "/topic/users/";
    private static final String NOTIFICATIONS_SUFFIX = "/notifications";
    private static final JwtGrantedAuthoritiesConverter JWT_AUTHORITIES_CONVERTER =
            new JwtGrantedAuthoritiesConverter();

    private final JwtDecoder jwtDecoder;
    private final BoardAccess boardAccess;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (StompCommand.CONNECT.equals(command) || StompCommand.STOMP.equals(command)) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            handleSubscribe(accessor);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = findAuthorizationHeader(accessor);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("WebSocket CONNECT without Authorization header");
            throw new IllegalArgumentException("Authorization header required");
        }

        Authentication auth = authenticateBearerHeader(authHeader, accessor, "CONNECT");
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalArgumentException("Invalid JWT token");
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        if (destination.startsWith(USER_TOPIC_PREFIX)) {
            handleUserTopicSubscribe(accessor, destination);
            return;
        }

        if (!destination.startsWith(BOARD_TOPIC_PREFIX)) {
            return;
        }

        Authentication auth = resolveAuthentication(accessor);
        if (auth == null || !auth.isAuthenticated()) {
            auth =
                    authenticateBearerHeader(
                            findAuthorizationHeader(accessor), accessor, "SUBSCRIBE");
        }
        if (auth == null || !auth.isAuthenticated()) {
            String subscribeAuthHeader = findAuthorizationHeader(accessor);
            log.warn(
                    "WebSocket SUBSCRIBE without authenticated user for destination {};"
                            + " sessionId={}, hasSessionAttributes={},"
                            + " hasSubscribeAuthorizationHeader={}",
                    destination,
                    accessor.getSessionId(),
                    accessor.getSessionAttributes() != null,
                    subscribeAuthHeader != null);
            throw new AccessDeniedException("Authentication required for board subscriptions");
        }

        UUID boardId = extractBoardId(destination);
        try {
            boardAccess.isCollaborator(auth.getName(), boardId);
        } catch (ForbiddenException ex) {
            throw new AccessDeniedException("BOARD_ACCESS_DENIED: board subscription forbidden");
        }
    }

    private void handleUserTopicSubscribe(StompHeaderAccessor accessor, String destination) {
        // Only allow subscriptions to notifications topic: /topic/users/{userId}/notifications
        if (!destination.endsWith(NOTIFICATIONS_SUFFIX)) {
            throw new AccessDeniedException("Invalid user topic subscription");
        }

        Authentication auth = resolveAuthentication(accessor);
        if (auth == null || !auth.isAuthenticated()) {
            auth =
                    authenticateBearerHeader(
                            findAuthorizationHeader(accessor), accessor, "SUBSCRIBE");
        }
        if (auth == null || !auth.isAuthenticated()) {
            log.warn(
                    "WebSocket SUBSCRIBE without authenticated user for user topic {};"
                            + " sessionId={}",
                    destination,
                    accessor.getSessionId());
            throw new AccessDeniedException("Authentication required for user topic subscriptions");
        }

        // Extract userId from /topic/users/{userId}/notifications
        String path = destination.substring(USER_TOPIC_PREFIX.length());
        int slashIndex = path.indexOf('/');
        if (slashIndex == -1) {
            throw new IllegalArgumentException("Invalid user topic destination format");
        }
        String userId = path.substring(0, slashIndex);

        // Verify the user is subscribing to their own notifications
        if (!auth.getName().equals(userId)) {
            log.warn(
                    "User {} attempted to subscribe to notifications for user {}",
                    auth.getName(),
                    userId);
            throw new AccessDeniedException(
                    "USER_ACCESS_DENIED: cannot subscribe to another user's notifications");
        }
    }

    private UUID extractBoardId(String destination) {
        String boardIdValue = destination.substring(BOARD_TOPIC_PREFIX.length());
        if (boardIdValue.contains("/")) {
            throw new IllegalArgumentException("Invalid board topic destination");
        }

        try {
            return UUID.fromString(boardIdValue);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid board id in subscription destination", e);
        }
    }

    private Authentication resolveAuthentication(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof Authentication authentication) {
            return authentication;
        }

        return null;
    }

    private Authentication authenticateBearerHeader(
            String authHeader, StompHeaderAccessor accessor, String source) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authHeader.substring(7);
        try {
            Jwt jwt = jwtDecoder.decode(token);
            Collection<GrantedAuthority> authorities = JWT_AUTHORITIES_CONVERTER.convert(jwt);
            Authentication auth =
                    new JwtAuthenticationToken(
                            jwt, authorities == null ? Collections.emptyList() : authorities);
            accessor.setUser(auth);
            return auth;
        } catch (JwtException e) {
            if (e.getMessage() != null && e.getMessage().contains("expired")) {
                log.debug("WebSocket {} token expired: {}", source, e.getMessage());
            } else {
                log.warn("WebSocket {} token authentication failed: {}", source, e.getMessage());
            }
            return null;
        }
    }

    private String findAuthorizationHeader(StompHeaderAccessor accessor) {
        String nativeHeader = accessor.getFirstNativeHeader("Authorization");
        if (nativeHeader != null) {
            return nativeHeader;
        }

        nativeHeader = accessor.getFirstNativeHeader("authorization");
        if (nativeHeader != null) {
            return nativeHeader;
        }

        Object header = accessor.getHeader("Authorization");
        if (header instanceof String stringHeader) {
            return stringHeader;
        }

        header = accessor.getHeader("authorization");
        if (header instanceof String stringHeader) {
            return stringHeader;
        }

        return null;
    }
}
