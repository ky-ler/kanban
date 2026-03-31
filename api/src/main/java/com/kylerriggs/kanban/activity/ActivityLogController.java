package com.kylerriggs.kanban.activity;

import com.kylerriggs.kanban.activity.dto.ActivityLogDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/boards/{boardId}/tasks/{taskId}/activity")
@RequiredArgsConstructor
public class ActivityLogController {
    private final ActivityLogService activityLogService;

    /**
     * Retrieves a page of activity logs for a task, ordered by most recent first. Requires the user
     * to be a collaborator on the board.
     *
     * @param boardId the ID of the board (used for authorization)
     * @param taskId the ID of the task
     * @param page zero-based page index (default 0)
     * @param size number of items per page (default 20)
     * @return page of activity log DTOs
     */
    @GetMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<Page<ActivityLogDto>> getTaskActivity(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ActivityLogDto> activity =
                activityLogService.getActivityForTask(boardId, taskId, page, size);
        return ResponseEntity.ok(activity);
    }
}
