package com.kylerriggs.velora.checklist;

import com.kylerriggs.velora.checklist.dto.ChecklistItemDto;
import com.kylerriggs.velora.checklist.dto.ChecklistItemRequest;
import com.kylerriggs.velora.checklist.dto.ChecklistReorderRequest;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/boards/{boardId}/tasks/{taskId}/checklist")
@RequiredArgsConstructor
public class ChecklistItemController {
    private final ChecklistItemService checklistItemService;

    /** Retrieves all checklist items for a task, ordered by position. */
    @GetMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<List<ChecklistItemDto>> getChecklistItems(
            @NonNull @PathVariable UUID boardId, @NonNull @PathVariable UUID taskId) {
        List<ChecklistItemDto> items = checklistItemService.getItemsForTask(boardId, taskId);
        return ResponseEntity.ok(items);
    }

    /** Creates a new checklist item on a task. */
    @PostMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<ChecklistItemDto> createChecklistItem(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @Valid @RequestBody ChecklistItemRequest request) {
        ChecklistItemDto item = checklistItemService.createItem(boardId, taskId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    /** Updates an existing checklist item. */
    @PutMapping("/{itemId}")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<ChecklistItemDto> updateChecklistItem(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @NonNull @PathVariable UUID itemId,
            @Valid @RequestBody ChecklistItemRequest request) {
        ChecklistItemDto item = checklistItemService.updateItem(boardId, taskId, itemId, request);
        return ResponseEntity.ok(item);
    }

    /** Toggles the completion status of a checklist item. */
    @PatchMapping("/{itemId}/toggle")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<ChecklistItemDto> toggleChecklistItem(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @NonNull @PathVariable UUID itemId) {
        ChecklistItemDto item = checklistItemService.toggleItem(boardId, taskId, itemId);
        return ResponseEntity.ok(item);
    }

    /** Reorders a checklist item to a new position. */
    @PatchMapping("/{itemId}/reorder")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<Void> reorderChecklistItem(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @NonNull @PathVariable UUID itemId,
            @Valid @RequestBody ChecklistReorderRequest request) {
        checklistItemService.reorderItem(boardId, taskId, itemId, request.newPosition());
        return ResponseEntity.noContent().build();
    }

    /** Deletes a checklist item. */
    @DeleteMapping("/{itemId}")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<Void> deleteChecklistItem(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID taskId,
            @NonNull @PathVariable UUID itemId) {
        checklistItemService.deleteItem(boardId, taskId, itemId);
        return ResponseEntity.noContent().build();
    }
}
