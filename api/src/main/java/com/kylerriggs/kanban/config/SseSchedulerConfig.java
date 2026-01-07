package com.kylerriggs.kanban.config;

import com.kylerriggs.kanban.sse.SseService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Configuration for scheduled tasks related to Server-Sent Events (SSE). Enables periodic heartbeat
 * messages to keep SSE connections alive and prevent timeouts from proxies and load balancers.
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class SseSchedulerConfig {

    private final SseService sseService;

    /**
     * Send heartbeat to all active SSE connections every 15 seconds. This prevents intermediate
     * proxies (like Nginx or load balancers) from closing idle connections due to timeout.
     */
    @Scheduled(fixedRate = 15000)
    public void heartbeat() {
        sseService.sendHeartbeat();
        log.trace("Heartbeat sent to all SSE connections");
    }
}
