package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.exception.BoardAccessException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.dto.MoveTaskRequest;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final ColumnRepository columnRepository;
    private final TaskMapper taskMapper;
    private final UserService userService;

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

        User assignedTo = null;

        String requestAssigneeId = createTaskRequest.assigneeId();
        if (StringUtils.hasText(requestAssigneeId)) {
            // This null check is only here to prevent Null type safety issues

            board.getCollaborators().stream()
                    .filter(c -> c.getUser().getId().equals(requestAssigneeId))
                    .findFirst()
                    .orElseThrow(
                            () ->
                                    new BoardAccessException(
                                            "User is not a collaborator on the board: "
                                                    + requestAssigneeId));

            assignedTo =
                    userRepository
                            .findById(requestAssigneeId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "User not found: " + requestAssigneeId));
        }

        // Get the next position (append to end)
        Integer maxOrder = taskRepository.findMaxPositionByBoardId(createTaskRequest.boardId());
        int newOrder = maxOrder + 1;

        Task newTask = taskMapper.toEntity(createTaskRequest, board, createdBy, assignedTo, column);
        newTask.setPosition(newOrder);
        board.getTasks().add(newTask);

        // TODO: Fix having to set the date modified manually
        board.setDateModified(Instant.now());
        boardRepository.save(board);
        return taskMapper.toDto(newTask);
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
        Board boardToUpdate =
                boardRepository
                        .findById(updateTaskRequest.boardId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Board not found: " + updateTaskRequest.boardId()));

        Task taskToUpdate =
                boardToUpdate.getTasks().stream()
                        .filter(i -> Objects.equals(i.getId(), taskId))
                        .findFirst()
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        taskToUpdate.setTitle(updateTaskRequest.title());
        taskToUpdate.setDescription(updateTaskRequest.description());

        if (!taskToUpdate.getColumn().getId().equals(updateTaskRequest.columnId())) {
            Column newColumn =
                    columnRepository
                            .findById(updateTaskRequest.columnId())
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Column not found: "
                                                            + updateTaskRequest.columnId()));
            taskToUpdate.setColumn(newColumn);
        }

        String currentAssigneeId =
                Optional.ofNullable(taskToUpdate.getAssignedTo()).map(User::getId).orElse(null);

        String requestAssigneeId = updateTaskRequest.assigneeId();

        if (!Objects.equals(currentAssigneeId, requestAssigneeId)) {
            if (StringUtils.hasText(requestAssigneeId)) {
                boardToUpdate.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(requestAssigneeId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new BoardAccessException(
                                                "User is not a collaborator on the board: "
                                                        + requestAssigneeId));

                User newAssignee =
                        userRepository
                                .findById(requestAssigneeId)
                                .orElseThrow(
                                        () ->
                                                new ResourceNotFoundException(
                                                        "User not found: " + requestAssigneeId));
                taskToUpdate.setAssignedTo(newAssignee);
            } else {
                taskToUpdate.setAssignedTo(null);
            }
        }

        // TODO: Fix having to set the date modified manually
        boardToUpdate.setDateModified(Instant.now());
        boardRepository.save(boardToUpdate);
        return taskMapper.toDto(taskToUpdate);
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
        board.getTasks().remove(taskToDelete);
    }

    /**
     * Moves a task to a new position within the same column or to a different column. Automatically
     * recalculates positions of all affected tasks in both source and destination columns.
     *
     * @param taskId the ID of the task to move
     * @param moveTaskRequest the new position and optional new column ID
     * @throws ResourceNotFoundException if the task or column doesn't exist
     */
    @Transactional
    public void moveTask(@NonNull UUID taskId, MoveTaskRequest moveTaskRequest) {
        Integer newPosition = moveTaskRequest.newPosition();
        UUID newColumnId = moveTaskRequest.newColumnId();

        Task taskToMove =
                taskRepository
                        .findById(taskId)
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

            // Adjust positions in old column (shift down tasks after the moved task)
            board.getTasks().stream()
                    .filter(t -> t.getColumn().getId().equals(oldColumnId))
                    .filter(t -> t.getPosition() > oldPosition)
                    .forEach(t -> t.setPosition(t.getPosition() - 1));

            // Adjust positions in new column (shift up tasks at/after new position)
            board.getTasks().stream()
                    .filter(t -> t.getColumn().getId().equals(newColumnId))
                    .filter(t -> t.getPosition() >= newPosition)
                    .forEach(t -> t.setPosition(t.getPosition() + 1));

            taskToMove.setColumn(newColumn);
            taskToMove.setPosition(newPosition);
        }
        // Same column reordering
        else {
            if (oldPosition.equals(newPosition)) {
                return; // No change needed
            }

            if (newPosition > oldPosition) {
                // Moving down: shift tasks between old and new position up
                board.getTasks().stream()
                        .filter(t -> t.getColumn().getId().equals(oldColumnId))
                        .filter(
                                t ->
                                        t.getPosition() > oldPosition
                                                && t.getPosition() <= newPosition)
                        .forEach(t -> t.setPosition(t.getPosition() - 1));
            } else {
                // Moving up: shift tasks between new and old position down
                board.getTasks().stream()
                        .filter(t -> t.getColumn().getId().equals(oldColumnId))
                        .filter(
                                t ->
                                        t.getPosition() >= newPosition
                                                && t.getPosition() < oldPosition)
                        .forEach(t -> t.setPosition(t.getPosition() + 1));
            }

            taskToMove.setPosition(newPosition);
        }

        board.setDateModified(Instant.now());
        boardRepository.save(board);
    }
}
