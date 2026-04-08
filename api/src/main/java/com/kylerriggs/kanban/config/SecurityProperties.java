package com.kylerriggs.kanban.config;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "kanban.security")
@Getter
@Setter
public class SecurityProperties {
    private String customClaimPrefix = "https://example.com/claims/";
    private List<String> corsAllowedOrigins = List.of("http://localhost:5173");
}
