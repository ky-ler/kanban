package com.kylerriggs.kanban.label;

import com.kylerriggs.kanban.label.dto.LabelDto;
import com.kylerriggs.kanban.label.dto.LabelRequest;
import com.kylerriggs.kanban.label.dto.LabelSummaryDto;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LabelController {
    private final LabelService labelService;

    /**
     * Gets all labels for a board.
     *
     * @param boardId the board ID
     * @return list of labels
     */
    @GetMapping("/boards/{boardId}/labels")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<List<LabelSummaryDto>> getLabelsByBoard(
            @NonNull @PathVariable UUID boardId) {
        return ResponseEntity.ok(labelService.getLabelsByBoard(boardId));
    }

    /**
     * Gets a single label by ID.
     *
     * @param labelId the label ID
     * @return the label
     */
    @GetMapping("/labels/{labelId}")
    @PreAuthorize("@labelAccess.isCollaborator(#labelId)")
    public ResponseEntity<LabelDto> getLabel(@NonNull @PathVariable UUID labelId) {
        return ResponseEntity.ok(labelService.getLabel(labelId));
    }

    /**
     * Creates a new label.
     *
     * @param request the label creation request
     * @return the created label
     */
    @PostMapping("/labels")
    @PreAuthorize("@boardAccess.isCollaborator(#request.boardId())")
    public ResponseEntity<LabelDto> createLabel(@Valid @RequestBody LabelRequest request) {
        LabelDto created = labelService.createLabel(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing label.
     *
     * @param labelId the label ID
     * @param request the update request
     * @return the updated label
     */
    @PutMapping("/labels/{labelId}")
    @PreAuthorize("@labelAccess.isCollaborator(#labelId)")
    public ResponseEntity<LabelDto> updateLabel(
            @NonNull @PathVariable UUID labelId, @Valid @RequestBody LabelRequest request) {
        return ResponseEntity.ok(labelService.updateLabel(labelId, request));
    }

    /**
     * Deletes a label.
     *
     * @param labelId the label ID
     * @return no content
     */
    @DeleteMapping("/labels/{labelId}")
    @PreAuthorize("@labelAccess.isCollaborator(#labelId)")
    public ResponseEntity<Void> deleteLabel(@NonNull @PathVariable UUID labelId) {
        labelService.deleteLabel(labelId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Adds a label to a task.
     *
     * @param taskId the task ID
     * @param labelId the label ID
     * @return no content
     */
    @PostMapping("/tasks/{taskId}/labels/{labelId}")
    @PreAuthorize("@taskAccess.isCollaborator(#taskId)")
    public ResponseEntity<Void> addLabelToTask(
            @NonNull @PathVariable UUID taskId, @NonNull @PathVariable UUID labelId) {
        labelService.addLabelToTask(taskId, labelId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Removes a label from a task.
     *
     * @param taskId the task ID
     * @param labelId the label ID
     * @return no content
     */
    @DeleteMapping("/tasks/{taskId}/labels/{labelId}")
    @PreAuthorize("@taskAccess.isCollaborator(#taskId)")
    public ResponseEntity<Void> removeLabelFromTask(
            @NonNull @PathVariable UUID taskId, @NonNull @PathVariable UUID labelId) {
        labelService.removeLabelFromTask(taskId, labelId);
        return ResponseEntity.noContent().build();
    }
}
