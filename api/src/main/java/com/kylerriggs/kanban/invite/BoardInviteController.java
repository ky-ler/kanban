package com.kylerriggs.kanban.invite;

import com.kylerriggs.kanban.invite.dto.AcceptInviteResponse;
import com.kylerriggs.kanban.invite.dto.BoardInviteDto;
import com.kylerriggs.kanban.invite.dto.CreateInviteRequest;
import com.kylerriggs.kanban.invite.dto.InvitePreviewDto;

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
public class BoardInviteController {
    private final BoardInviteService inviteService;

    /**
     * Creates a new invite for a board. Requires admin access to the board.
     *
     * @param request the invite creation request
     * @return the created invite
     */
    @PostMapping("/invites")
    @PreAuthorize("@boardAccess.isAdmin(#request.boardId())")
    public ResponseEntity<BoardInviteDto> createInvite(
            @Valid @RequestBody CreateInviteRequest request) {
        BoardInviteDto created = inviteService.createInvite(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Gets all active invites for a board. Requires admin access to the board.
     *
     * @param boardId the board ID
     * @return list of active invites
     */
    @GetMapping("/boards/{boardId}/invites")
    @PreAuthorize("@boardAccess.isAdmin(#boardId)")
    public ResponseEntity<List<BoardInviteDto>> getInvites(@NonNull @PathVariable UUID boardId) {
        return ResponseEntity.ok(inviteService.getInvitesForBoard(boardId));
    }

    /**
     * Revokes an invite. Requires admin access to the invite's board.
     *
     * @param inviteId the invite ID
     * @return no content
     */
    @DeleteMapping("/invites/{inviteId}")
    @PreAuthorize("@inviteAccess.isAdmin(#inviteId)")
    public ResponseEntity<Void> revokeInvite(@NonNull @PathVariable UUID inviteId) {
        inviteService.revokeInvite(inviteId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gets a preview of an invite. This is a public endpoint that does not require authentication.
     * Returns the board name and whether the invite is valid.
     *
     * @param code the invite code
     * @return the invite preview
     */
    @GetMapping("/invites/{code}/preview")
    public ResponseEntity<InvitePreviewDto> previewInvite(@NonNull @PathVariable String code) {
        return ResponseEntity.ok(inviteService.getInvitePreview(code));
    }

    /**
     * Accepts an invite and joins the board. Requires authentication.
     *
     * @param code the invite code
     * @return the accept response with board information
     */
    @PostMapping("/invites/{code}/accept")
    public ResponseEntity<AcceptInviteResponse> acceptInvite(@NonNull @PathVariable String code) {
        return ResponseEntity.ok(inviteService.acceptInvite(code));
    }
}
