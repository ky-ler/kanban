package com.kylerriggs.kanban.column;

import com.kylerriggs.kanban.column.dto.ColumnDto;

import lombok.AllArgsConstructor;

import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
public class ColumnMapper {
    /**
     * Converts a Column entity to a DTO.
     *
     * @param column the column entity to convert
     * @return the column as a DTO
     */
    public ColumnDto toDto(Column column) {
        return new ColumnDto(column.getId(), column.getName(), column.getPosition());
    }
}
