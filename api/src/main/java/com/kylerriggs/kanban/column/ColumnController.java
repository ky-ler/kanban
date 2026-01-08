package com.kylerriggs.kanban.column;

import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.column.dto.CreateColumnRequest;
import com.kylerriggs.kanban.column.dto.MoveColumnRequest;
import com.kylerriggs.kanban.column.dto.UpdateColumnRequest;

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
@RequestMapping("/boards/{boardId}/columns")
@RequiredArgsConstructor
public class ColumnController {
    private final ColumnService columnService;

    /**
     * Creates a new column in the specified board. Requires collaborator access on the board.
     *
     * @param boardId the ID of the board
     * @param request the column creation request
     * @return the created column DTO with location header
     */
    @PostMapping
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<ColumnDto> createColumn(
            @NonNull @PathVariable UUID boardId,
            @NonNull @Valid @RequestBody CreateColumnRequest request) {
        ColumnDto createdColumn = columnService.createColumn(boardId, request);

        URI location =
                ServletUriComponentsBuilder.fromCurrentRequest()
                        .path("/{columnId}")
                        .buildAndExpand(createdColumn.id())
                        .toUri();

        return ResponseEntity.created(location).body(createdColumn);
    }

    /**
     * Updates a column's name. Requires collaborator access on the board.
     *
     * @param boardId the ID of the board (for URL structure)
     * @param columnId the ID of the column to update
     * @param request the update request
     * @return the updated column DTO
     */
    @PutMapping("/{columnId}")
    @PreAuthorize("@columnAccess.isCollaborator(#columnId)")
    public ResponseEntity<ColumnDto> updateColumn(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID columnId,
            @NonNull @Valid @RequestBody UpdateColumnRequest request) {
        ColumnDto updatedColumn = columnService.updateColumn(columnId, request);
        return ResponseEntity.ok(updatedColumn);
    }

    /**
     * Deletes a column from the board. Requires collaborator access. Fails if the column contains
     * any tasks.
     *
     * @param boardId the ID of the board (for URL structure)
     * @param columnId the ID of the column to delete
     * @return no content
     */
    @DeleteMapping("/{columnId}")
    @PreAuthorize("@columnAccess.isCollaborator(#columnId)")
    public ResponseEntity<Void> deleteColumn(
            @NonNull @PathVariable UUID boardId, @NonNull @PathVariable UUID columnId) {
        columnService.deleteColumn(columnId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Moves a column to a new position within the board. Requires collaborator access. Uses
     * pessimistic locking to handle concurrent modifications.
     *
     * @param boardId the ID of the board (for URL structure)
     * @param columnId the ID of the column to move
     * @param request the move request containing the new position
     * @return no content
     */
    @PatchMapping("/{columnId}/move")
    @PreAuthorize("@columnAccess.isCollaborator(#columnId)")
    public ResponseEntity<Void> moveColumn(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable UUID columnId,
            @NonNull @Valid @RequestBody MoveColumnRequest request) {
        columnService.moveColumn(columnId, request);
        return ResponseEntity.ok().build();
    }
}
