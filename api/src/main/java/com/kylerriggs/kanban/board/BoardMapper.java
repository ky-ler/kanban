package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.board.dto.BoardDto;
import com.kylerriggs.kanban.board.dto.BoardSummary;
import com.kylerriggs.kanban.board.dto.CollaboratorDto;
import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.UserMapper;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import lombok.AllArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@AllArgsConstructor
@Service
public class BoardMapper {
    private final UserMapper userMapper;
    private final TaskMapper taskMapper;

    /**
     * Converts a Board entity to a detailed DTO with all collaborators, tasks, and columns.
     *
     * @param board the board entity to convert
     * @param currentUserId the ID of the current user to determine favorite status
     * @return the board as a detailed DTO
     */
    public BoardDto toDto(Board board, String currentUserId) {
        return toDto(board, currentUserId, Map.of());
    }

    /**
     * Converts a Board entity to a detailed DTO with all collaborators, tasks, and columns.
     *
     * @param board the board entity to convert
     * @param currentUserId the ID of the current user to determine favorite status
     * @param commentCountByTaskId precomputed comment counts by task ID
     * @return the board as a detailed DTO
     */
    public BoardDto toDto(Board board, String currentUserId, Map<UUID, Long> commentCountByTaskId) {
        UserSummaryDto creatorSummary = userMapper.toSummaryDto(board.getCreatedBy());

        CollaboratorDto[] collaborators =
                board.getCollaborators().stream()
                        .map(
                                c ->
                                        new CollaboratorDto(
                                                userMapper.toSummaryDto(c.getUser()), c.getRole()))
                        .toArray(CollaboratorDto[]::new);

        TaskSummaryDto[] tasks =
                board.getTasks().stream()
                        .map(
                                task ->
                                        taskMapper.toSummaryDto(
                                                task,
                                                commentCountByTaskId.getOrDefault(
                                                        task.getId(), 0L)))
                        .toArray(TaskSummaryDto[]::new);

        ColumnDto[] columns =
                board.getColumns().stream()
                        .map(
                                column ->
                                        new ColumnDto(
                                                column.getId(),
                                                column.getName(),
                                                column.getPosition(),
                                                column.isArchived()))
                        .toArray(ColumnDto[]::new);

        boolean isFavorite =
                board.getCollaborators().stream()
                        .anyMatch(c -> c.getUser().getId().equals(currentUserId) && c.isFavorite());

        return new BoardDto(
                board.getId(),
                board.getName(),
                board.getDescription(),
                creatorSummary,
                collaborators,
                tasks,
                columns,
                board.isArchived(),
                board.getDateCreated().toString(),
                board.getDateModified().toString(),
                isFavorite);
    }

    /**
     * Converts a Board entity to a summary DTO with task counts and basic information. Used for
     * listing multiple boards without loading all details.
     *
     * @param board the board entity to convert
     * @param currentUserId the ID of the current user to determine favorite status
     * @return the board as a summary DTO
     */
    public BoardSummary toSummaryDto(Board board, String currentUserId) {
        int completedTasks = (int) board.getTasks().stream().filter(Task::isCompleted).count();

        boolean isFavorite =
                board.getCollaborators().stream()
                        .anyMatch(c -> c.getUser().getId().equals(currentUserId) && c.isFavorite());

        return new BoardSummary(
                board.getId(),
                board.getName(),
                board.getDescription(),
                board.getDateModified().toString(),
                completedTasks,
                board.getTasks().size(),
                board.isArchived(),
                isFavorite);
    }
}
