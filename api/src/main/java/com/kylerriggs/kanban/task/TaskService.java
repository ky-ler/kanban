package com.kylerriggs.kanban.task;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.kanban.activity.ActivityLogService;
import com.kylerriggs.kanban.activity.ActivityType;
import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardAccessException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.label.Label;
import com.kylerriggs.kanban.label.LabelRepository;
import com.kylerriggs.kanban.task.dto.MoveTaskRequest;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final ColumnRepository columnRepository;
    private final LabelRepository labelRepository;
    private final TaskMapper taskMapper;
    private final UserService userService;
    private final BoardEventPublisher eventPublisher;
    private final ActivityLogService activityLogService;
    private final ObjectMapper objectMapper;

    /**
     * Retrieves a single task by its ID.
     *
     * @param taskId the ID of the task
     * @return the task as a DTO
     * @throws ResourceNotFoundException if the task doesn't exist
     */
    public TaskDto getTask(@NonNull UUID taskId) {
        Task task =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        return taskMapper.toDto(task);
    }

    /**
     * Creates a new task in the specified board and column. The task is added to the end of the
     * column's task list.
     *
     * @param createTaskRequest the task creation request containing title, description, board,
     *     column, and optional assignee
     * @return the created task as a DTO
     * @throws UnauthorizedException if the user is not authenticated
     * @throws ResourceNotFoundException if the user, board, column, or assignee doesn't exist
     * @throws BoardAccessException if the assignee is not a board collaborator
     */
    @Transactional
    public TaskDto createTask(@NonNull TaskRequest createTaskRequest) {
        String requestUserId = userService.getCurrentUserId();

        if (requestUserId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        User createdBy =
                userRepository
                        .findById(requestUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "User not found: " + requestUserId));

        Board board =
                boardRepository
                        .findById(createTaskRequest.boardId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Board not found: " + createTaskRequest.boardId()));

        Column column =
                columnRepository
                        .findById(createTaskRequest.columnId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: "
                                                        + createTaskRequest.columnId()));

        // Validate column belongs to the specified board
        if (!column.getBoard().getId().equals(board.getId())) {
            throw new BadRequestException("Column does not belong to this board");
        }

        User assignedTo = null;

        String requestAssigneeId = createTaskRequest.assigneeId();

        if (StringUtils.hasText(requestAssigneeId)) {
            String assigneeId = Objects.requireNonNull(requestAssigneeId);

            board.getCollaborators().stream()
                    .filter(c -> c.getUser().getId().equals(assigneeId))
                    .findFirst()
                    .orElseThrow(
                            () ->
                                    new BoardAccessException(
                                            "User is not a collaborator on the board: "
                                                    + assigneeId));

            assignedTo =
                    userRepository
                            .findById(assigneeId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "User not found: " + assigneeId));
        }

        // Get the next position (append to end)
        Integer maxOrder = taskRepository.findMaxPositionByBoardId(createTaskRequest.boardId());
        int newOrder = maxOrder + 1;

        Task newTask = taskMapper.toEntity(createTaskRequest, board, createdBy, assignedTo, column);
        newTask.setPosition(newOrder);

        // Handle labels
        if (createTaskRequest.labelIds() != null && !createTaskRequest.labelIds().isEmpty()) {
            Set<Label> labels = new LinkedHashSet<>();
            for (UUID labelId : createTaskRequest.labelIds()) {
                Label label =
                        labelRepository
                                .findByIdAndBoardId(labelId, board.getId())
                                .orElseThrow(
                                        () ->
                                                new BadRequestException(
                                                        "Label not found or doesn't belong to this"
                                                                + " board: "
                                                                + labelId));
                labels.add(label);
            }
            newTask.setLabels(labels);
        }

        // Save task directly to ensure ID is generated before broadcasting
        Task savedTask = taskRepository.save(newTask);

        // Atomically update board's dateModified to avoid optimistic locking conflicts
        boardRepository.touchDateModified(board.getId(), Instant.now());

        // Publish event to be broadcast after transaction commits
        eventPublisher.publish("TASK_CREATED", board.getId(), savedTask.getId());

        // Log activity
        activityLogService.logActivity(savedTask, ActivityType.TASK_CREATED, null);

        return taskMapper.toDto(savedTask);
    }

    /**
     * Updates an existing task's title, description, column, and assignee. Validates that the
     * assignee (if changed) is a board collaborator.
     *
     * @param taskId the ID of the task to update
     * @param updateTaskRequest the task update request
     * @return the updated task as a DTO
     * @throws ResourceNotFoundException if the task, board, column, or assignee doesn't exist
     * @throws BoardAccessException if the new assignee is not a board collaborator
     */
    @Transactional
    public TaskDto updateTask(@NonNull UUID taskId, TaskRequest updateTaskRequest) {
        // Load task directly instead of through board to avoid version conflicts
        Task taskToUpdate =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        // Validate task belongs to the specified board
        Board board = taskToUpdate.getBoard();
        if (!board.getId().equals(updateTaskRequest.boardId())) {
            throw new BadRequestException("Task does not belong to this board");
        }

        // Capture old values for activity logging
        String oldTitle = taskToUpdate.getTitle();
        String oldDescription = taskToUpdate.getDescription();
        Priority oldPriority = taskToUpdate.getPriority();
        String oldAssigneeId =
                Optional.ofNullable(taskToUpdate.getAssignedTo()).map(User::getId).orElse(null);
        Set<UUID> oldLabelIds =
                taskToUpdate.getLabels().stream().map(Label::getId).collect(Collectors.toSet());
        String oldDueDate =
                taskToUpdate.getDueDate() != null ? taskToUpdate.getDueDate().toString() : null;

        taskToUpdate.setTitle(updateTaskRequest.title());
        taskToUpdate.setDescription(updateTaskRequest.description());

        // Update priority
        Priority newPriority = null;
        if (updateTaskRequest.priority() != null && !updateTaskRequest.priority().isBlank()) {
            newPriority = Priority.valueOf(updateTaskRequest.priority().toUpperCase());
        }
        taskToUpdate.setPriority(newPriority);

        // Update due date
        taskToUpdate.setDueDate(updateTaskRequest.dueDate());

        if (!taskToUpdate.getColumn().getId().equals(updateTaskRequest.columnId())) {
            Column newColumn =
                    columnRepository
                            .findById(updateTaskRequest.columnId())
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Column not found: "
                                                            + updateTaskRequest.columnId()));

            // Validate new column belongs to the same board
            if (!newColumn.getBoard().getId().equals(board.getId())) {
                throw new BadRequestException("Column does not belong to this board");
            }

            taskToUpdate.setColumn(newColumn);
        }

        String requestAssigneeId = updateTaskRequest.assigneeId();

        if (!Objects.equals(oldAssigneeId, requestAssigneeId)) {
            if (StringUtils.hasText(requestAssigneeId)) {
                String newAssigneeId = Objects.requireNonNull(requestAssigneeId);

                board.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(newAssigneeId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new BoardAccessException(
                                                "User is not a collaborator on the board: "
                                                        + newAssigneeId));

                User newAssignee =
                        userRepository
                                .findById(newAssigneeId)
                                .orElseThrow(
                                        () ->
                                                new ResourceNotFoundException(
                                                        "User not found: " + newAssigneeId));
                taskToUpdate.setAssignedTo(newAssignee);
            } else {
                taskToUpdate.setAssignedTo(null);
            }
        }

        // Update labels
        List<UUID> requestLabelIds = updateTaskRequest.labelIds();
        if (requestLabelIds != null) {
            Set<Label> newLabels = new LinkedHashSet<>();
            for (UUID labelId : requestLabelIds) {
                Label label =
                        labelRepository
                                .findByIdAndBoardId(labelId, board.getId())
                                .orElseThrow(
                                        () ->
                                                new BadRequestException(
                                                        "Label not found or doesn't belong to this"
                                                                + " board: "
                                                                + labelId));
                newLabels.add(label);
            }
            taskToUpdate.getLabels().clear();
            taskToUpdate.getLabels().addAll(newLabels);
        }

        // Atomically update board's dateModified to avoid optimistic locking conflicts
        boardRepository.touchDateModified(board.getId(), Instant.now());

        // Publish event to be broadcast after transaction commits
        eventPublisher.publish("TASK_UPDATED", board.getId(), taskId);

        // Log activity for changes
        logTaskUpdateActivities(
                taskToUpdate,
                oldTitle,
                oldDescription,
                oldPriority,
                oldAssigneeId,
                oldLabelIds,
                oldDueDate,
                requestLabelIds);

        return taskMapper.toDto(taskToUpdate);
    }

    private void logTaskUpdateActivities(
            Task task,
            String oldTitle,
            String oldDescription,
            Priority oldPriority,
            String oldAssigneeId,
            Set<UUID> oldLabelIds,
            String oldDueDate,
            List<UUID> requestLabelIds) {

        // Check for title/description changes (general update)
        boolean titleChanged = !Objects.equals(oldTitle, task.getTitle());
        boolean descriptionChanged = !Objects.equals(oldDescription, task.getDescription());

        if (titleChanged || descriptionChanged) {
            Map<String, Object> details = new HashMap<>();
            if (titleChanged) {
                details.put("oldTitle", oldTitle);
                details.put("newTitle", task.getTitle());
            }
            if (descriptionChanged) {
                details.put("descriptionChanged", true);
            }
            activityLogService.logActivity(task, ActivityType.TASK_UPDATED, toJson(details));
        }

        // Check for assignee change
        String newAssigneeId =
                Optional.ofNullable(task.getAssignedTo()).map(User::getId).orElse(null);
        if (!Objects.equals(oldAssigneeId, newAssigneeId)) {
            Map<String, Object> details = new HashMap<>();
            details.put("oldAssigneeId", oldAssigneeId);
            details.put("newAssigneeId", newAssigneeId);
            if (task.getAssignedTo() != null) {
                details.put("newAssigneeUsername", task.getAssignedTo().getUsername());
            }
            activityLogService.logActivity(task, ActivityType.ASSIGNEE_CHANGED, toJson(details));
        }

        // Check for priority change
        if (!Objects.equals(oldPriority, task.getPriority())) {
            Map<String, Object> details = new HashMap<>();
            details.put("oldPriority", oldPriority != null ? oldPriority.name() : null);
            details.put(
                    "newPriority", task.getPriority() != null ? task.getPriority().name() : null);
            activityLogService.logActivity(task, ActivityType.PRIORITY_CHANGED, toJson(details));
        }

        // Check for due date change
        String newDueDate = task.getDueDate() != null ? task.getDueDate().toString() : null;
        if (!Objects.equals(oldDueDate, newDueDate)) {
            Map<String, Object> details = new HashMap<>();
            details.put("oldDueDate", oldDueDate);
            details.put("newDueDate", newDueDate);
            activityLogService.logActivity(task, ActivityType.DUE_DATE_CHANGED, toJson(details));
        }

        // Check for labels change
        if (requestLabelIds != null) {
            Set<UUID> newLabelIds =
                    task.getLabels().stream().map(Label::getId).collect(Collectors.toSet());
            if (!Objects.equals(oldLabelIds, newLabelIds)) {
                Map<String, Object> details = new HashMap<>();
                details.put("oldLabelIds", oldLabelIds);
                details.put("newLabelIds", newLabelIds);
                activityLogService.logActivity(task, ActivityType.LABELS_CHANGED, toJson(details));
            }
        }
    }

    private String toJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * Deletes a task from its board.
     *
     * @param taskId the ID of the task to delete
     * @throws ResourceNotFoundException if the task doesn't exist
     */
    @Transactional
    public void deleteTask(@NonNull UUID taskId) {
        Task taskToDelete =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        Board board = taskToDelete.getBoard();
        UUID boardId = board.getId();

        // Log activity before deleting (include task title in details)
        Map<String, Object> details = new HashMap<>();
        details.put("taskTitle", taskToDelete.getTitle());
        activityLogService.logActivity(taskToDelete, ActivityType.TASK_DELETED, toJson(details));

        // Delete the task directly
        taskRepository.delete(taskToDelete);

        // Atomically update board's dateModified to avoid optimistic locking conflicts
        boardRepository.touchDateModified(boardId, Instant.now());

        // Publish event to be broadcast after transaction commits
        eventPublisher.publish("TASK_DELETED", boardId, taskId);
    }

    /**
     * Moves a task to a new position within the same column or to a different column. Automatically
     * recalculates positions of all affected tasks in both source and destination columns.
     *
     * <p>This method uses pessimistic locking and atomic SQL updates to prevent race conditions
     * when multiple users move tasks concurrently.
     *
     * @param taskId the ID of the task to move
     * @param moveTaskRequest the new position and optional new column ID
     * @throws ResourceNotFoundException if the task or column doesn't exist
     */
    @Transactional
    public void moveTask(@NonNull UUID taskId, MoveTaskRequest moveTaskRequest) {
        Integer newPosition = moveTaskRequest.newPosition();
        UUID newColumnId = moveTaskRequest.newColumnId();

        // Use pessimistic write lock to prevent concurrent modifications
        Task taskToMove =
                taskRepository
                        .findByIdWithLock(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        Board board = taskToMove.getBoard();
        Integer oldPosition = taskToMove.getPosition();
        UUID oldColumnId = taskToMove.getColumn().getId();

        // If changing columns
        if (newColumnId != null && !oldColumnId.equals(newColumnId)) {
            Column newColumn =
                    columnRepository
                            .findById(newColumnId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Column not found: " + newColumnId));

            // Validate new column belongs to the same board
            if (!newColumn.getBoard().getId().equals(board.getId())) {
                throw new BadRequestException("Column does not belong to this board");
            }

            // Adjust positions in old column (shift down tasks after the moved task)
            taskRepository.decrementPositionsAfter(oldColumnId, oldPosition);

            // Adjust positions in new column (shift up tasks at/after new position)
            taskRepository.incrementPositionsFrom(newColumnId, newPosition);

            taskToMove.setColumn(newColumn);
            taskToMove.setPosition(newPosition);
        }
        // Same column reordering
        else {
            if (oldPosition.equals(newPosition)) {
                return; // No change needed
            }

            if (newPosition > oldPosition) {
                // Moving down: Shift tasks between old and new position up
                taskRepository.decrementPositionsInRange(oldColumnId, oldPosition, newPosition);
            } else {
                // Moving up: Shift tasks between new and old position down
                taskRepository.incrementPositionsInRange(oldColumnId, newPosition, oldPosition);
            }

            taskToMove.setPosition(newPosition);
        }

        // Atomically update board's dateModified to avoid optimistic locking conflicts
        boardRepository.touchDateModified(board.getId(), Instant.now());

        // Publish event to be broadcast after transaction commits
        eventPublisher.publish("TASK_MOVED", board.getId(), taskId);

        // Log activity for move
        Map<String, Object> details = new HashMap<>();
        details.put("oldColumnId", oldColumnId.toString());
        details.put("newColumnId", taskToMove.getColumn().getId().toString());
        details.put("oldPosition", oldPosition);
        details.put("newPosition", taskToMove.getPosition());
        activityLogService.logActivity(taskToMove, ActivityType.TASK_MOVED, toJson(details));
    }
}
