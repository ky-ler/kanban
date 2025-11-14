package com.kylerriggs.kanban.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "kanban.board")
@Getter
@Setter
public class BoardProperties {
    private int maxBoardsPerUser = 10;
}

