package com.kylerriggs.kanban.config;

import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration using STOMP protocol for real-time board updates. Replaces SSE to avoid
 * connection leak issues.
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final SecurityProperties securityProperties;
    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Enable simple in-memory broker for /topic destinations
        config.enableSimpleBroker("/topic");
        // Prefix for messages from clients to server (if needed for bidirectional)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    @SuppressWarnings("null")
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        String[] origins = securityProperties.getCorsAllowedOrigins().toArray(String[]::new);

        // Register native WebSocket endpoint (for modern browsers)
        // Use setAllowedOriginPatterns for more flexibility with wildcards
        registry.addEndpoint("/ws").setAllowedOriginPatterns(origins);

        // Register SockJS fallback endpoint (for older browsers)
        registry.addEndpoint("/ws-sockjs").setAllowedOriginPatterns(origins).withSockJS();
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // Add auth interceptor to validate JWT on STOMP CONNECT
        registration.interceptors(webSocketAuthInterceptor);
    }
}
