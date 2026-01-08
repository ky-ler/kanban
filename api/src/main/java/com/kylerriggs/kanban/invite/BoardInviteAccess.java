package com.kylerriggs.kanban.invite;

import com.kylerriggs.kanban.board.BoardAccess;
import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component("inviteAccess")
@AllArgsConstructor
@Slf4j
public class BoardInviteAccess extends BaseAccess {
    private final BoardInviteRepository inviteRepository;
    private final BoardAccess boardAccess;

    /**
     * Checks if the current user is an admin on the board that owns the invite.
     *
     * @param inviteId the ID of the invite to check
     * @return true if the user is an admin on the invite's board
     * @throws ResourceNotFoundException if the invite doesn't exist
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isAdmin(@NonNull UUID inviteId) {
        BoardInvite invite =
                inviteRepository
                        .findById(inviteId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Invite not found: " + inviteId));
        return boardAccess.isAdmin(invite.getBoard().getId());
    }
}
