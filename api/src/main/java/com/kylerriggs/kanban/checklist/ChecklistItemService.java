package com.kylerriggs.kanban.checklist;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.kanban.activity.ActivityLogService;
import com.kylerriggs.kanban.activity.ActivityType;
import com.kylerriggs.kanban.checklist.dto.ChecklistItemDto;
import com.kylerriggs.kanban.checklist.dto.ChecklistItemRequest;
import com.kylerriggs.kanban.checklist.dto.ChecklistProgressDto;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserLookupService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;
import com.kylerriggs.kanban.websocket.dto.BoardEventType;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChecklistItemService {
    private static final long GAP = 1_000_000L;

    private final ChecklistItemRepository checklistItemRepository;
    private final ChecklistItemMapper checklistItemMapper;
    private final TaskRepository taskRepository;
    private final UserLookupService userLookupService;
    private final BoardEventPublisher eventPublisher;
    private final ActivityLogService activityLogService;
    private final ObjectMapper objectMapper;

    /** Retrieves all checklist items for a task, ordered by position. */
    public List<ChecklistItemDto> getItemsForTask(@NonNull UUID boardId, @NonNull UUID taskId) {
        requireTaskInBoard(boardId, taskId);
        return checklistItemRepository.findByTaskIdOrderByPositionAsc(taskId).stream()
                .map(checklistItemMapper::toDto)
                .toList();
    }

    /** Gets the checklist progress (total and completed counts) for a task. */
    public ChecklistProgressDto getProgressForTask(@NonNull UUID taskId) {
        long total = checklistItemRepository.countByTaskId(taskId);
        long completed = checklistItemRepository.countByTaskIdAndIsCompletedTrue(taskId);
        return checklistItemMapper.toProgressDto(total, completed);
    }

    /** Creates a new checklist item on a task. */
    @Transactional
    public ChecklistItemDto createItem(
            @NonNull UUID boardId, @NonNull UUID taskId, @NonNull ChecklistItemRequest request) {
        Task task = requireTaskInBoard(boardId, taskId);

        User assignee = null;
        if (request.assigneeId() != null && !request.assigneeId().isBlank()) {
            assignee = userLookupService.getRequiredUser(request.assigneeId());
        }

        long position = checklistItemRepository.findMaxPositionByTaskId(taskId).orElse(0L) + GAP;

        ChecklistItem item = checklistItemMapper.toEntity(request, task, assignee, position);
        ChecklistItem saved = checklistItemRepository.save(item);

        eventPublisher.publish(BoardEventType.CHECKLIST_ITEM_ADDED, boardId, saved.getId());
        activityLogService.logActivity(
                task, ActivityType.CHECKLIST_ITEM_ADDED, toJson(Map.of("title", request.title())));

        return checklistItemMapper.toDto(saved);
    }

    /** Updates an existing checklist item. */
    @Transactional
    public ChecklistItemDto updateItem(
            @NonNull UUID boardId,
            @NonNull UUID taskId,
            @NonNull UUID itemId,
            @NonNull ChecklistItemRequest request) {
        ChecklistItem item = requireItemInTask(boardId, taskId, itemId);

        boolean wasCompleted = item.isCompleted();
        boolean isNowCompleted = request.isCompleted() != null && request.isCompleted();

        item.setTitle(request.title());
        item.setCompleted(isNowCompleted);
        item.setDueDate(request.dueDate());
        item.setDateModified(Instant.now());

        if (request.assigneeId() != null && !request.assigneeId().isBlank()) {
            User assignee = userLookupService.getRequiredUser(request.assigneeId());
            item.setAssignedTo(assignee);
        } else {
            item.setAssignedTo(null);
        }

        ChecklistItem saved = checklistItemRepository.save(item);
        UUID bId = item.getTask().getBoard().getId();

        eventPublisher.publish(BoardEventType.CHECKLIST_ITEM_UPDATED, bId, saved.getId());

        // Log appropriate activity type based on completion change
        if (!wasCompleted && isNowCompleted) {
            activityLogService.logActivity(
                    item.getTask(),
                    ActivityType.CHECKLIST_ITEM_COMPLETED,
                    toJson(Map.of("title", item.getTitle())));
        } else if (wasCompleted && !isNowCompleted) {
            activityLogService.logActivity(
                    item.getTask(),
                    ActivityType.CHECKLIST_ITEM_UNCOMPLETED,
                    toJson(Map.of("title", item.getTitle())));
        } else {
            activityLogService.logActivity(
                    item.getTask(),
                    ActivityType.CHECKLIST_ITEM_UPDATED,
                    toJson(Map.of("title", item.getTitle())));
        }

        return checklistItemMapper.toDto(saved);
    }

    /** Toggles the completion status of a checklist item. */
    @Transactional
    public ChecklistItemDto toggleItem(
            @NonNull UUID boardId, @NonNull UUID taskId, @NonNull UUID itemId) {
        ChecklistItem item = requireItemInTask(boardId, taskId, itemId);

        boolean wasCompleted = item.isCompleted();
        item.setCompleted(!wasCompleted);
        item.setDateModified(Instant.now());

        ChecklistItem saved = checklistItemRepository.save(item);
        UUID bId = item.getTask().getBoard().getId();

        eventPublisher.publish(BoardEventType.CHECKLIST_ITEM_UPDATED, bId, saved.getId());

        ActivityType activityType =
                wasCompleted
                        ? ActivityType.CHECKLIST_ITEM_UNCOMPLETED
                        : ActivityType.CHECKLIST_ITEM_COMPLETED;
        activityLogService.logActivity(
                item.getTask(), activityType, toJson(Map.of("title", item.getTitle())));

        return checklistItemMapper.toDto(saved);
    }

    /** Reorders a checklist item to a new position. */
    @Transactional
    public void reorderItem(
            @NonNull UUID boardId,
            @NonNull UUID taskId,
            @NonNull UUID itemId,
            @NonNull Long newPosition) {
        ChecklistItem item = requireItemInTask(boardId, taskId, itemId);

        item.setPosition(newPosition);
        item.setDateModified(Instant.now());

        checklistItemRepository.save(item);

        eventPublisher.publish(
                BoardEventType.CHECKLIST_ITEM_REORDERED,
                item.getTask().getBoard().getId(),
                item.getId());
    }

    /** Deletes a checklist item. */
    @Transactional
    public void deleteItem(@NonNull UUID boardId, @NonNull UUID taskId, @NonNull UUID itemId) {
        ChecklistItem item = requireItemInTask(boardId, taskId, itemId);

        String title = item.getTitle();
        Task task = item.getTask();
        UUID bId = task.getBoard().getId();

        checklistItemRepository.delete(item);

        eventPublisher.publish(BoardEventType.CHECKLIST_ITEM_DELETED, bId, itemId);
        activityLogService.logActivity(
                task, ActivityType.CHECKLIST_ITEM_DELETED, toJson(Map.of("title", title)));
    }

    private Task requireTaskInBoard(UUID boardId, UUID taskId) {
        return taskRepository
                .findByIdAndBoardId(taskId, boardId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Task not found in board: " + taskId));
    }

    private ChecklistItem requireItemInTask(UUID boardId, UUID taskId, UUID itemId) {
        ChecklistItem item =
                checklistItemRepository
                        .findByIdWithTask(itemId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Checklist item not found: " + itemId));

        UUID itemTaskId = item.getTask().getId();
        UUID itemBoardId = item.getTask().getBoard().getId();
        if (!itemTaskId.equals(taskId) || !itemBoardId.equals(boardId)) {
            throw new ResourceNotFoundException(
                    "Checklist item not found in task/board context: " + itemId);
        }

        return item;
    }

    private String toJson(Map<String, String> details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
