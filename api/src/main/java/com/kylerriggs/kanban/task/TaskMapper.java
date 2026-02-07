package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.label.LabelMapper;
import com.kylerriggs.kanban.label.dto.LabelSummaryDto;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserMapper;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import lombok.AllArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@AllArgsConstructor
@Service
public class TaskMapper {
    private final UserMapper userMapper;
    private final LabelMapper labelMapper;

    /**
     * Converts a Task entity to a detailed DTO with creator, assignee, and timestamps.
     *
     * @param task the task entity to convert
     * @return the task as a detailed DTO
     */
    public TaskDto toDto(Task task) {
        UserSummaryDto createdBy = userMapper.toSummaryDto(task.getCreatedBy());

        UserSummaryDto assignedTo =
                task.getAssignedTo() != null
                        ? new UserSummaryDto(
                                task.getAssignedTo().getId(),
                                task.getAssignedTo().getUsername(),
                                task.getAssignedTo().getProfileImageUrl())
                        : null;

        List<LabelSummaryDto> labels =
                task.getLabels().stream().map(labelMapper::toSummaryDto).toList();

        return new TaskDto(
                task.getId(),
                createdBy,
                assignedTo,
                task.getTitle(),
                task.getDescription(),
                task.getColumn().getId(),
                task.getPosition(),
                task.isCompleted(),
                task.isArchived(),
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                labels,
                task.getDateCreated() != null ? task.getDateCreated().toString() : null,
                task.getDateModified() != null ? task.getDateModified().toString() : null);
    }

    /**
     * Converts a Task entity to a summary DTO with minimal information. Used for displaying tasks
     * in board overviews without loading all details.
     *
     * @param task the task entity to convert
     * @return the task as a summary DTO
     */
    public TaskSummaryDto toSummaryDto(Task task) {
        return toSummaryDto(task, 0L);
    }

    /**
     * Converts a Task entity to a summary DTO with precomputed comment count.
     *
     * @param task the task entity to convert
     * @param commentCount total comments for the task
     * @return the task as a summary DTO
     */
    public TaskSummaryDto toSummaryDto(Task task, long commentCount) {
        UserSummaryDto assignee = null;
        if (task.getAssignedTo() != null) {
            assignee = userMapper.toSummaryDto(task.getAssignedTo());
        }

        List<LabelSummaryDto> labels =
                task.getLabels().stream().map(labelMapper::toSummaryDto).toList();

        boolean hasDescription = task.getDescription() != null && !task.getDescription().isBlank();

        return new TaskSummaryDto(
                task.getId(),
                task.getTitle(),
                task.getColumn().getId(),
                assignee,
                task.getPosition(),
                task.isCompleted(),
                task.isArchived(),
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                labels,
                commentCount,
                hasDescription);
    }

    /**
     * Converts a task creation request and related entities to a Task entity.
     *
     * @param req the task creation request
     * @param board the board the task belongs to
     * @param createdBy the user creating the task
     * @param assignedTo the user assigned to the task (can be null)
     * @param column the column the task belongs to
     * @return the new task entity
     */
    public Task toEntity(
            TaskRequest req, Board board, User createdBy, User assignedTo, Column column) {
        Priority priority = null;
        if (req.priority() != null && !req.priority().isBlank()) {
            priority = Priority.valueOf(req.priority().toUpperCase());
        }

        Task task =
                Task.builder()
                        .board(board)
                        .createdBy(createdBy)
                        .title(req.title())
                        .description(req.description())
                        .column(column)
                        .priority(priority)
                        .dueDate(req.dueDate())
                        .build();

        if (assignedTo != null) {
            task.setAssignedTo(assignedTo);
        }

        return task;
    }
}
