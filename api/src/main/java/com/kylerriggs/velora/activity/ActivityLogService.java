package com.kylerriggs.velora.activity;

import com.kylerriggs.velora.activity.dto.ActivityLogDto;
import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.exception.ResourceNotFoundException;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.task.TaskRepository;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserLookupService;
import com.kylerriggs.velora.websocket.BoardEventPublisher;
import com.kylerriggs.velora.websocket.dto.BoardEventType;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityLogService {
    private final ActivityLogRepository activityLogRepository;
    private final ActivityLogMapper activityLogMapper;
    private final TaskRepository taskRepository;
    private final UserLookupService userLookupService;
    private final BoardEventPublisher eventPublisher;

    /**
     * Retrieves a page of activity logs for a task, ordered by most recent first.
     *
     * @param boardId the ID of the board (used for validation)
     * @param taskId the ID of the task
     * @param page zero-based page index
     * @param size number of items per page
     * @return page of activity log DTOs
     */
    public Page<ActivityLogDto> getActivityForTask(
            @NonNull UUID boardId, @NonNull UUID taskId, int page, int size) {
        if (!taskRepository.existsByIdAndBoardId(taskId, boardId)) {
            throw new ResourceNotFoundException("Task not found in board: " + taskId);
        }

        return activityLogRepository
                .findByTaskIdOrderByDateCreatedDesc(taskId, PageRequest.of(page, size))
                .map(activityLogMapper::toDto);
    }

    /**
     * Retrieves a page of activity logs for an entire board, ordered by most recent first.
     *
     * @param boardId the ID of the board
     * @param page zero-based page index
     * @param size number of items per page
     * @return page of activity log DTOs for the board
     */
    public Page<ActivityLogDto> getActivityForBoard(@NonNull UUID boardId, int page, int size) {
        return activityLogRepository
                .findByBoardIdOrderByDateCreatedDesc(boardId, PageRequest.of(page, size))
                .map(activityLogMapper::toDto);
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
        User user = userLookupService.getRequiredCurrentUser();

        ActivityLog activityLog =
                ActivityLog.builder()
                        .board(task.getBoard())
                        .task(task)
                        .user(user)
                        .type(type)
                        .details(details)
                        .build();

        activityLogRepository.save(activityLog);

        // Broadcast activity event after transaction commits
        eventPublisher.publish(
                BoardEventType.ACTIVITY_LOGGED, task.getBoard().getId(), task.getId());
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

    /**
     * Logs a board-level activity (e.g. column events) not tied to any task.
     *
     * @param board the board the activity is for
     * @param type the type of activity
     * @param details optional JSON details about the activity
     */
    @Transactional
    public void logBoardActivity(
            @NonNull Board board, @NonNull ActivityType type, @Nullable String details) {
        User user = userLookupService.getRequiredCurrentUser();

        ActivityLog activityLog =
                ActivityLog.builder().board(board).user(user).type(type).details(details).build();

        activityLogRepository.save(activityLog);

        eventPublisher.publish(BoardEventType.ACTIVITY_LOGGED, board.getId(), null);
    }
}
