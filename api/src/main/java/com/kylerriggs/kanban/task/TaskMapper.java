package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.label.LabelMapper;
import com.kylerriggs.kanban.label.dto.LabelSummaryDto;
import com.kylerriggs.kanban.task.dto.MyTaskDto;
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
        return toSummaryDto(task, 0L, null);
    }

    /**
     * Converts a Task entity to a summary DTO with precomputed comment count.
     *
     * @param task the task entity to convert
     * @param commentCount total comments for the task
     * @return the task as a summary DTO
     */
    public TaskSummaryDto toSummaryDto(Task task, long commentCount) {
        return toSummaryDto(task, commentCount, null);
    }

    /**
     * Converts a Task entity to a summary DTO with precomputed comment count and checklist
     * progress.
     *
     * @param task the task entity to convert
     * @param commentCount total comments for the task
     * @param checklistProgress checklist progress for the task (can be null)
     * @return the task as a summary DTO
     */
    public TaskSummaryDto toSummaryDto(
            Task task,
            long commentCount,
            com.kylerriggs.kanban.checklist.dto.ChecklistProgressDto checklistProgress) {
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
                hasDescription,
                checklistProgress);
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
        Task task =
                Task.builder()
                        .board(board)
                        .createdBy(createdBy)
                        .title(req.title())
                        .description(req.description())
                        .column(column)
                        .isCompleted(req.isCompleted())
                        .isArchived(req.isArchived())
                        .dueDate(req.dueDate())
                        .build();

        if (assignedTo != null) {
            task.setAssignedTo(assignedTo);
        }

        return task;
    }

    /**
     * Converts a Task entity to a cross-board "My Task" DTO that includes board and column context.
     * Used by the /tasks/me endpoint to provide context when tasks span multiple boards.
     *
     * @param task the task entity to convert
     * @return the task as a MyTaskDto with board/column names
     */
    public MyTaskDto toMyTaskDto(Task task) {
        UserSummaryDto assignedTo =
                task.getAssignedTo() != null ? userMapper.toSummaryDto(task.getAssignedTo()) : null;

        List<LabelSummaryDto> labels =
                task.getLabels().stream().map(labelMapper::toSummaryDto).toList();

        return new MyTaskDto(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getDueDate() != null ? task.getDueDate().toString() : null,
                task.isCompleted(),
                task.isArchived(),
                task.getBoard().getId(),
                task.getBoard().getName(),
                task.getColumn().getId(),
                task.getColumn().getName(),
                assignedTo,
                labels,
                task.getDateCreated() != null ? task.getDateCreated().toString() : null,
                task.getDateModified() != null ? task.getDateModified().toString() : null);
    }
}
