package com.kylerriggs.velora.activity;

import com.kylerriggs.velora.activity.dto.ActivityLogDto;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/boards/{boardId}/activity")
@RequiredArgsConstructor
public class BoardActivityController {
    private final ActivityLogService activityLogService;

    /**
     * Retrieves a paginated list of activity logs for a board, ordered by most recent first.
     * Requires the user to be a collaborator on the board.
     *
     * @param boardId the ID of the board
     * @param page zero-based page index (default 0)
     * @param size number of items per page (default 20)
     * @return page of activity log DTOs
     */
    @GetMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<Page<ActivityLogDto>> getBoardActivity(
            @NonNull @PathVariable UUID boardId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ActivityLogDto> activity = activityLogService.getActivityForBoard(boardId, page, size);
        return ResponseEntity.ok(activity);
    }
}
