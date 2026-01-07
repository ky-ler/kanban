package com.kylerriggs.kanban.config;

import com.github.benmanes.caffeine.cache.Caffeine;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Configures Caffeine as the cache manager with appropriate TTL settings.
     *
     * <p>Cache configuration:
     *
     * <ul>
     *   <li><b>userSync</b>: 10-minute TTL, max 10,000 entries
     *       <ul>
     *         <li>Caches user synchronization status to avoid DB queries on every request
     *         <li>TTL ensures user profile changes propagate within 10 minutes
     *         <li>Max size prevents unbounded memory growth
     *       </ul>
     * </ul>
     *
     * @return the configured cache manager
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("userSync");
        Caffeine<Object, Object> caffeine =
                Caffeine.newBuilder()
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .maximumSize(10_000)
                        .recordStats(); // Enable cache statistics for monitoring
        cacheManager.setCaffeine(Objects.requireNonNull(caffeine));

        return cacheManager;
    }
}
