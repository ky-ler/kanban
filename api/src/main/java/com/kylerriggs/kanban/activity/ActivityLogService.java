package com.kylerriggs.kanban.activity;

import com.kylerriggs.kanban.activity.dto.ActivityLogDto;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityLogService {
    private final ActivityLogRepository activityLogRepository;
    private final ActivityLogMapper activityLogMapper;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final BoardEventPublisher eventPublisher;

    /**
     * Retrieves all activity logs for a task, ordered by most recent first.
     *
     * @param taskId the ID of the task
     * @return list of activity log DTOs
     */
    public List<ActivityLogDto> getActivityForTask(@NonNull UUID taskId) {
        return activityLogRepository.findByTaskIdOrderByDateCreatedDesc(taskId).stream()
                .map(activityLogMapper::toDto)
                .toList();
    }

    /**
     * Logs an activity for a task. This method is intended to be called within an existing
     * transaction.
     *
     * @param task the task the activity is for
     * @param type the type of activity
     * @param details optional JSON details about the activity
     */
    @Transactional
    public void logActivity(
            @NonNull Task task, @NonNull ActivityType type, @Nullable String details) {
        String currentUserId = userService.getCurrentUserId();

        if (currentUserId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        User user =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "User not found: " + currentUserId));

        ActivityLog activityLog =
                ActivityLog.builder().task(task).user(user).type(type).details(details).build();

        activityLogRepository.save(activityLog);

        // Broadcast activity event after transaction commits
        eventPublisher.publish("ACTIVITY_LOGGED", task.getBoard().getId(), task.getId());
    }

    /**
     * Logs an activity for a task by task ID. Useful when the task entity is not readily available.
     *
     * @param taskId the ID of the task
     * @param type the type of activity
     * @param details optional JSON details about the activity
     */
    @Transactional
    public void logActivityByTaskId(
            @NonNull UUID taskId, @NonNull ActivityType type, @Nullable String details) {
        Task task =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        logActivity(task, type, details);
    }
}
