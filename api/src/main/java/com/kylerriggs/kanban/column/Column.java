package com.kylerriggs.kanban.column;

import com.kylerriggs.kanban.board.Board;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "columns")
public class Column {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @jakarta.persistence.Column(nullable = false, columnDefinition = "TEXT", length = 100)
    @Size(min = 1, max = 100)
    private String name;

    @jakarta.persistence.Column(nullable = false)
    private Integer position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;
}
