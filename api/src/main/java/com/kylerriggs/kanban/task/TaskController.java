package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.task.dto.MoveTaskRequest;
import com.kylerriggs.kanban.task.dto.TaskDto;
import com.kylerriggs.kanban.task.dto.TaskRequest;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskService taskService;

    /**
     * Retrieves a single task by its ID. Requires the user to be a collaborator on the board that
     * owns the task.
     *
     * @param taskId the ID of the task to retrieve
     * @return the task DTO
     */
    @GetMapping("/{taskId}")
    @PreAuthorize("@taskAccess.isCollaborator(#taskId)")
    public ResponseEntity<TaskDto> getTask(@NonNull @PathVariable UUID taskId) {
        TaskDto task = taskService.getTask(taskId);
        return ResponseEntity.ok(task);
    }

    /**
     * Creates a new task in the specified board and column. Requires the user to be a collaborator
     * on the board that owns the task.
     *
     * @param taskRequest the task creation request
     * @return the created task DTO with location header
     */
    @PostMapping()
    @PreAuthorize("@boardAccess.isCollaborator(#taskRequest.boardId())")
    public ResponseEntity<TaskDto> createTask(
            @NonNull @Valid @RequestBody TaskRequest taskRequest) {
        TaskDto createdTask = taskService.createTask(taskRequest);

        URI location =
                ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path("/api/boards/{boardId}/tasks/{taskId}")
                        .buildAndExpand(taskRequest.boardId(), createdTask.id())
                        .toUri();

        return ResponseEntity.created(location).body(createdTask);
    }

    /**
     * Updates an existing task's title, description, column, and assignee. Requires the user to be
     * a collaborator on the board that owns the task.
     *
     * @param taskId the ID of the task to update
     * @param taskRequest the task update request
     * @return the updated task DTO
     */
    @PutMapping("/{taskId}")
    @PreAuthorize("@taskAccess.isCollaborator(#taskId)")
    public ResponseEntity<TaskDto> updateTask(
            @NonNull @PathVariable UUID taskId,
            @NonNull @Valid @RequestBody TaskRequest taskRequest) {
        TaskDto updatedTask = taskService.updateTask(taskId, taskRequest);

        return ResponseEntity.ok(updatedTask);
    }

    /**
     * Moves a task to a new position and optionally to a different column. The backend
     * automatically recalculates positions of affected tasks. Requires the user to be a
     * collaborator on the board.
     *
     * @param taskId the ID of the task to move
     * @param moveTaskRequest the move request containing new position and optional column ID
     * @return no content
     */
    @PatchMapping("/{taskId}")
    @PreAuthorize("@taskAccess.isCollaborator(#taskId)")
    public ResponseEntity<Void> moveTask(
            @NonNull @PathVariable UUID taskId,
            @NonNull @Valid @RequestBody MoveTaskRequest moveTaskRequest) {
        taskService.moveTask(taskId, moveTaskRequest);
        return ResponseEntity.ok().build();
    }

    /**
     * Deletes a task from its board. Requires the user to be a collaborator on the board that owns
     * the task.
     *
     * @param taskId the ID of the task to delete
     * @return no content
     */
    @DeleteMapping("/{taskId}")
    @PreAuthorize("@taskAccess.isCollaborator(#taskId)")
    public ResponseEntity<Void> deleteTask(@NonNull @PathVariable UUID taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }
}
