package com.kylerriggs.kanban.column;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ColumnRepository extends JpaRepository<Column, UUID> {
}
