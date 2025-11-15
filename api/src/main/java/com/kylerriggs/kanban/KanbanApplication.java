package com.kylerriggs.kanban;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class KanbanApplication {

    public static void main(String[] args) {
        SpringApplication.run(KanbanApplication.class, args);
    }
}
