package com.kylerriggs.kanban.column;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.column.dto.CreateColumnRequest;
import com.kylerriggs.kanban.column.dto.MoveColumnRequest;
import com.kylerriggs.kanban.column.dto.UpdateColumnRequest;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import lombok.AllArgsConstructor;
import lombok.NonNull;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ColumnService {
    private final ColumnRepository columnRepository;
    private final ColumnMapper columnMapper;
    private final BoardRepository boardRepository;
    private final BoardEventPublisher eventPublisher;

    /**
     * Creates a new column in the specified board.
     *
     * @param boardId the ID of the board
     * @param request the column creation request
     * @return the created column as a DTO
     */
    @Transactional
    public ColumnDto createColumn(@NonNull UUID boardId, @NonNull CreateColumnRequest request) {
        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        Integer position = request.position();

        // If position is null, append to end
        if (position == null) {
            position = columnRepository.findMaxPositionByBoardId(boardId) + 1;
        } else {
            // Shift existing columns at and after the specified position
            columnRepository.incrementPositionsFrom(boardId, position);
        }

        Column column =
                Column.builder().name(request.name()).position(position).board(board).build();

        column = columnRepository.save(Objects.requireNonNull(column));

        board.setDateModified(Instant.now());
        boardRepository.save(board);

        // Broadcast event via WebSocket
        eventPublisher.publish("COLUMN_CREATED", boardId, column.getId());

        return columnMapper.toDto(column);
    }

    /**
     * Updates a column's name.
     *
     * @param columnId the ID of the column
     * @param request the update request
     * @return the updated column as a DTO
     */
    @Transactional
    public ColumnDto updateColumn(@NonNull UUID columnId, @NonNull UpdateColumnRequest request) {
        Column column =
                columnRepository
                        .findById(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));

        column.setName(request.name());
        column = columnRepository.save(column);

        Board board = column.getBoard();
        board.setDateModified(Instant.now());
        boardRepository.save(board);

        // Broadcast event via WebSocket
        eventPublisher.publish("COLUMN_UPDATED", Objects.requireNonNull(board.getId()), columnId);

        return columnMapper.toDto(column);
    }

    /**
     * Deletes a column. Fails if the column contains any tasks.
     *
     * @param columnId the ID of the column to delete
     * @throws BadRequestException if the column contains tasks
     */
    @Transactional
    public void deleteColumn(@NonNull UUID columnId) {
        Column column =
                columnRepository
                        .findByIdWithLock(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));

        // Check for existing tasks
        if (columnRepository.hasTasksInColumn(columnId)) {
            throw new BadRequestException(
                    "Cannot delete column with tasks. Move or delete tasks first.");
        }

        Board board = column.getBoard();
        UUID boardId = board.getId();
        int position = column.getPosition();

        // Shift positions of columns after the deleted one
        columnRepository.decrementPositionsAfter(boardId, position);

        columnRepository.delete(column);

        board.setDateModified(Instant.now());
        boardRepository.save(board);

        // Broadcast event via WebSocket
        eventPublisher.publish("COLUMN_DELETED", Objects.requireNonNull(boardId), columnId);
    }

    /**
     * Moves a column to a new position within the same board. Uses pessimistic locking to prevent
     * race conditions when multiple users reorder columns concurrently.
     *
     * @param columnId the ID of the column to move
     * @param request the move request with the new position
     */
    @Transactional
    public void moveColumn(@NonNull UUID columnId, @NonNull MoveColumnRequest request) {
        Integer newPosition = request.newPosition();

        // Use pessimistic write lock to prevent concurrent modifications
        Column column =
                columnRepository
                        .findByIdWithLock(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));

        Board board = column.getBoard();
        UUID boardId = board.getId();
        Integer oldPosition = column.getPosition();

        // No change needed
        if (oldPosition.equals(newPosition)) {
            return;
        }

        // Validate new position is within bounds
        long columnCount = columnRepository.countByBoardId(boardId);
        if (newPosition >= columnCount) {
            throw new BadRequestException(
                    "Invalid position: " + newPosition + ". Max position is " + (columnCount - 1));
        }

        if (newPosition > oldPosition) {
            // Moving right: Shift columns between old and new position left
            columnRepository.decrementPositionsInRange(boardId, oldPosition, newPosition);
        } else {
            // Moving left: Shift columns between new and old position right
            columnRepository.incrementPositionsInRange(boardId, newPosition, oldPosition);
        }

        column.setPosition(newPosition);
        columnRepository.save(column);

        board.setDateModified(Instant.now());
        boardRepository.save(board);

        // Broadcast event via WebSocket
        eventPublisher.publish("COLUMN_MOVED", Objects.requireNonNull(boardId), columnId);
    }
}
