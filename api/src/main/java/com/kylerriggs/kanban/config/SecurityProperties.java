package com.kylerriggs.kanban.config;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "kanban.security")
@Getter
@Setter
public class SecurityProperties {
    private String customClaimPrefix = "https://example.com/claims/";
    private List<String> corsAllowedOrigins = List.of("https://localhost:5173");
}
