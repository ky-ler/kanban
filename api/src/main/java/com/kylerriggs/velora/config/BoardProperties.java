package com.kylerriggs.velora.config;

import lombok.Getter;
import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "velora.board")
@Getter
@Setter
public class BoardProperties {
    private int maxBoardsPerUser = 10;
    private List<String> defaultColumns =
            List.of("Backlog", "To Do", "In Progress", "Done", "Canceled");
}
