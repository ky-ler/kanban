package com.kylerriggs.velora.column;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.velora.activity.ActivityLogService;
import com.kylerriggs.velora.activity.ActivityType;
import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.board.BoardRepository;
import com.kylerriggs.velora.column.dto.ColumnArchiveRequest;
import com.kylerriggs.velora.column.dto.ColumnDto;
import com.kylerriggs.velora.column.dto.CreateColumnRequest;
import com.kylerriggs.velora.column.dto.MoveColumnRequest;
import com.kylerriggs.velora.column.dto.UpdateColumnRequest;
import com.kylerriggs.velora.exception.BadRequestException;
import com.kylerriggs.velora.exception.ResourceNotFoundException;
import com.kylerriggs.velora.task.TaskArchiveService;
import com.kylerriggs.velora.task.TaskRepository;
import com.kylerriggs.velora.websocket.BoardEventPublisher;
import com.kylerriggs.velora.websocket.dto.BoardEventType;

import lombok.AllArgsConstructor;
import lombok.NonNull;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@AllArgsConstructor
public class ColumnService {
    private final ColumnRepository columnRepository;
    private final ColumnMapper columnMapper;
    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final TaskArchiveService taskArchiveService;
    private final BoardEventPublisher eventPublisher;
    private final ActivityLogService activityLogService;
    private final ObjectMapper objectMapper;

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

        if (board.isArchived()) {
            throw new BadRequestException(
                    "Board is archived. Unarchive it before modifying columns.");
        }

        int activeColumnCount = (int) columnRepository.countByBoardIdAndIsArchivedFalse(boardId);
        Integer position = request.position();

        // If position is null, append to end
        if (position == null) {
            position = activeColumnCount;
        } else {
            if (position < 0 || position > activeColumnCount) {
                throw new BadRequestException(
                        "Invalid position: " + position + ". Max position is " + activeColumnCount);
            }
            // Shift existing columns at and after the specified position
            columnRepository.incrementActivePositionsFrom(boardId, position);
        }

        Column column =
                Column.builder().name(request.name()).position(position).board(board).build();

        column = columnRepository.save(column);

        Map<String, Object> details = new HashMap<>();
        details.put("columnName", column.getName());
        activityLogService.logBoardActivity(board, ActivityType.COLUMN_CREATED, toJson(details));

        // Broadcast event via WebSocket
        eventPublisher.publish(BoardEventType.COLUMN_CREATED, boardId, column.getId());

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

        if (column.getBoard().isArchived()) {
            throw new BadRequestException(
                    "Board is archived. Unarchive it before modifying columns.");
        }

        if (column.isArchived()) {
            throw new BadRequestException("Column is archived. Restore it before editing it.");
        }

        String oldName = column.getName();
        column.setName(request.name());
        column = columnRepository.save(column);

        Board board = column.getBoard();

        Map<String, Object> details = new HashMap<>();
        details.put("oldName", oldName);
        details.put("newName", column.getName());
        activityLogService.logBoardActivity(board, ActivityType.COLUMN_UPDATED, toJson(details));

        // Broadcast event via WebSocket
        eventPublisher.publish(BoardEventType.COLUMN_UPDATED, board.getId(), columnId);

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

        if (!column.isArchived()) {
            throw new BadRequestException("Column must be archived before it can be deleted.");
        }

        if (taskRepository.countByColumnIdAndIsArchivedFalse(columnId) > 0) {
            throw new BadRequestException(
                    "Cannot delete a column with active tasks. Archive those tasks first.");
        }

        Board board = column.getBoard();
        UUID boardId = board.getId();
        String columnName = column.getName();
        taskRepository.deleteByColumnId(columnId);

        columnRepository.delete(column);

        Map<String, Object> details = new HashMap<>();
        details.put("columnName", columnName);
        activityLogService.logBoardActivity(board, ActivityType.COLUMN_DELETED, toJson(details));

        // Broadcast event via WebSocket
        eventPublisher.publish(BoardEventType.COLUMN_DELETED, boardId, columnId);
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

        if (board.isArchived()) {
            throw new BadRequestException("Board is archived. Unarchive it before moving columns.");
        }

        if (column.isArchived()) {
            throw new BadRequestException(
                    "Archived columns cannot be moved. Restore the column first.");
        }

        // No change needed
        if (oldPosition.equals(newPosition)) {
            return;
        }

        // Validate new position is within bounds
        long columnCount = columnRepository.countByBoardIdAndIsArchivedFalse(boardId);
        if (newPosition >= columnCount) {
            throw new BadRequestException(
                    "Invalid position: " + newPosition + ". Max position is " + (columnCount - 1));
        }

        if (newPosition > oldPosition) {
            // Moving right: Shift columns between old and new position left
            columnRepository.decrementActivePositionsInRange(boardId, oldPosition, newPosition);
        } else {
            // Moving left: Shift columns between new and old position right
            columnRepository.incrementActivePositionsInRange(boardId, newPosition, oldPosition);
        }

        column.setPosition(newPosition);
        columnRepository.save(column);

        Map<String, Object> details = new HashMap<>();
        details.put("columnName", column.getName());
        details.put("oldPosition", oldPosition);
        details.put("newPosition", newPosition);
        activityLogService.logBoardActivity(board, ActivityType.COLUMN_MOVED, toJson(details));

        // Broadcast event via WebSocket
        eventPublisher.publish(BoardEventType.COLUMN_MOVED, boardId, columnId);
    }

    @Transactional
    public ColumnDto updateColumnArchive(
            @NonNull UUID boardId, @NonNull UUID columnId, @NonNull ColumnArchiveRequest request) {
        Column column =
                columnRepository
                        .findByIdWithLock(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));

        UUID columnBoardId = column.getBoard().getId();
        if (!columnBoardId.equals(boardId)) {
            throw new ResourceNotFoundException("Column not found in board: " + columnId);
        }

        if (column.getBoard().isArchived()) {
            throw new BadRequestException(
                    "Board is archived. Unarchive it before restoring or archiving columns.");
        }

        boolean shouldArchive = request.isArchived();
        if (column.isArchived() == shouldArchive) {
            return columnMapper.toDto(column);
        }

        if (shouldArchive && !column.isArchived()) {
            long unarchivedTaskCount = taskRepository.countByColumnIdAndIsArchivedFalse(columnId);
            if (unarchivedTaskCount > 0 && !request.confirmArchiveTasks()) {
                throw new BadRequestException(
                        "Column has unarchived tasks. Set confirmArchiveTasks=true to archive all"
                                + " tasks in this column.");
            }

            if (unarchivedTaskCount > 0) {
                taskArchiveService.archiveTasks(
                        taskRepository.findByColumnIdOrderByPosition(columnId));
            }
            column.setRestorePosition(column.getPosition());
            columnRepository.decrementActivePositionsAfter(boardId, column.getPosition());
            column.setPosition(columnRepository.findMaxPositionByBoardId(boardId) + 1);
        } else if (!shouldArchive && column.isArchived()) {
            int activeColumnCount =
                    (int) columnRepository.countByBoardIdAndIsArchivedFalse(boardId);
            Integer previousRestorePosition = column.getRestorePosition();
            int restorePosition =
                    Math.max(
                            0,
                            Math.min(
                                    previousRestorePosition != null
                                            ? previousRestorePosition
                                            : activeColumnCount,
                                    activeColumnCount));
            columnRepository.incrementActivePositionsFrom(boardId, restorePosition);
            column.setPosition(restorePosition);
            column.setRestorePosition(null);
        }

        column.setArchived(shouldArchive);
        columnRepository.save(column);

        ActivityType activityType =
                shouldArchive ? ActivityType.COLUMN_ARCHIVED : ActivityType.COLUMN_RESTORED;
        Map<String, Object> details = new HashMap<>();
        details.put("columnName", column.getName());
        activityLogService.logBoardActivity(column.getBoard(), activityType, toJson(details));

        eventPublisher.publish(BoardEventType.COLUMN_UPDATED, boardId, columnId);

        return columnMapper.toDto(column);
    }

    private String toJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
