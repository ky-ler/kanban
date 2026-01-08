package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.board.dto.*;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    /**
     * Creates a new board with the given name and description. The creator is automatically added
     * as an admin.
     *
     * @param boardRequest the board creation request containing name and description
     * @return the created board DTO with location header
     */
    @PostMapping
    public ResponseEntity<BoardDto> createBoard(@Valid @RequestBody BoardRequest boardRequest) {
        BoardDto board = boardService.createBoard(boardRequest);

        URI location =
                ServletUriComponentsBuilder.fromCurrentRequest()
                        .path("/{boardId}")
                        .buildAndExpand(board.id())
                        .toUri();

        return ResponseEntity.created(location).body(board);
    }

    /**
     * Retrieves a single board by its ID with all details. Requires the user to be a collaborator
     * on the board.
     *
     * @param boardId the ID of the board to retrieve
     * @return the board DTO
     */
    @GetMapping("/{boardId}")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<BoardDto> getBoard(@NonNull @PathVariable UUID boardId) {
        BoardDto board = boardService.getBoard(boardId);
        return ResponseEntity.ok(board);
    }

    /**
     * Retrieves all tasks associated with a specific board. Requires the user to be a collaborator
     * on the board.
     *
     * @param boardId the ID of the board
     * @return list of task summaries
     */
    @GetMapping("/{boardId}/tasks")
    @PreAuthorize("@boardAccess.isCollaborator(#boardId)")
    public ResponseEntity<List<TaskSummaryDto>> getTasksForBoard(
            @NonNull @PathVariable UUID boardId) {
        List<TaskSummaryDto> tasks = boardService.getTasksForBoard(boardId);
        return ResponseEntity.ok(tasks);
    }

    /**
     * Retrieves all boards that the current user is a collaborator on. Returns summary information
     * for each board.
     *
     * @return list of board summaries
     */
    @GetMapping
    public ResponseEntity<List<BoardSummary>> getBoardsForUser() {
        List<BoardSummary> boards = boardService.getBoardsForUser();
        return ResponseEntity.ok(boards);
    }

    /**
     * Updates the name and description of an existing board. Only the creator of the board can
     * perform this action.
     *
     * @param boardId the ID of the board to update
     * @param boardRequest board update request containing new name and description
     * @return the updated board DTO
     */
    @PutMapping("/{boardId}")
    @PreAuthorize("@boardAccess.isCreator(#boardId)")
    public ResponseEntity<BoardDto> updateBoard(
            @NonNull @PathVariable UUID boardId, @Valid @RequestBody BoardRequest boardRequest) {
        BoardDto updatedBoard = boardService.updateBoard(boardId, boardRequest);
        return ResponseEntity.ok(updatedBoard);
    }

    // /**
    // * Deletes a board and all its associated data.
    // * Requires admin privileges on the board.
    // * Disabled for now, I want to implement archiving instead.
    // *
    // * @param boardId the ID of the board to delete
    // * @return no content
    // */
    // @DeleteMapping("/{boardId}")
    // @PreAuthorize("@boardAccess.isAdmin(#boardId)")
    // public ResponseEntity<Void> deleteBoard(@PathVariable UUID boardId) {
    // boardService.deleteBoard(boardId);
    // return ResponseEntity.noContent().build();
    // }

    /**
     * Adds a new collaborator to a board with the specified role. Requires admin privileges on the
     * board.
     *
     * @param boardId the ID of the board
     * @param collaboratorRequest the collaborator request containing user ID and role
     * @return no content
     */
    @PostMapping("/{boardId}/collaborators")
    @PreAuthorize("@boardAccess.isAdmin(#boardId)")
    public ResponseEntity<Void> addCollaborator(
            @NonNull @PathVariable UUID boardId,
            @Valid @RequestBody CollaboratorRequest collaboratorRequest) {
        boardService.addCollaborator(boardId, collaboratorRequest);
        return ResponseEntity.noContent().build();
    }

    /**
     * Removes a collaborator from a board. Requires admin privileges on the board.
     *
     * @param boardId the ID of the board
     * @param userId the ID of the user to remove
     * @return no content
     */
    @DeleteMapping("/{boardId}/collaborators/{userId}")
    @PreAuthorize("@boardAccess.isAdmin(#boardId)")
    public ResponseEntity<Void> removeCollaborator(
            @NonNull @PathVariable UUID boardId, @NonNull @PathVariable String userId) {
        boardService.removeCollaborator(boardId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Updates the role of a collaborator on a board. Requires admin privileges on the board.
     *
     * @param boardId the ID of the board
     * @param userId the ID of the user whose role to update
     * @param req the role update request containing the new role
     * @return no content
     */
    @PutMapping("/{boardId}/collaborators/{userId}")
    @PreAuthorize("@boardAccess.isCreator(#boardId)")
    public ResponseEntity<Void> updateCollaboratorRole(
            @NonNull @PathVariable UUID boardId,
            @NonNull @PathVariable String userId,
            @Valid @RequestBody RoleUpdateRequest req) {
        boardService.updateCollaboratorRole(boardId, userId, req.newRole());
        return ResponseEntity.ok().build();
    }
}
