package com.kylerriggs.kanban.column;

import static org.junit.jupiter.api.Assertions.*;

import com.kylerriggs.kanban.column.dto.ColumnDto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

class ColumnMapperTest {

    private ColumnMapper columnMapper;

    @BeforeEach
    void setUp() {
        columnMapper = new ColumnMapper();
    }

    @Test
    void toDto_ShouldMapAllFields() {
        // Given
        UUID columnId = UUID.randomUUID();
        Column column = new Column();
        column.setId(columnId);
        column.setName("To Do");
        column.setPosition(0);

        // When
        ColumnDto result = columnMapper.toDto(column);

        // Then
        assertEquals(columnId, result.id());
        assertEquals("To Do", result.name());
        assertEquals(0, result.position());
    }

    @Test
    void toDto_WithDifferentPosition_ShouldMapCorrectly() {
        // Given
        UUID columnId = UUID.randomUUID();
        Column column = new Column();
        column.setId(columnId);
        column.setName("Done");
        column.setPosition(3);

        // When
        ColumnDto result = columnMapper.toDto(column);

        // Then
        assertEquals(3, result.position());
    }
}
