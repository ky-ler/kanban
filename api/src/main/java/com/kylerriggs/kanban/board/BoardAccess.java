package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ForbiddenException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component("boardAccess")
@AllArgsConstructor
@Slf4j
public class BoardAccess extends BaseAccess {
    private final BoardUserRepository boardUserRepository;
    private final BoardRepository boardRepository;

    /**
     * Checks if the current user is a collaborator on the specified board. This includes both
     * admins and regular members.
     *
     * @param boardId the ID of the board to check
     * @return true if the user is a collaborator, false otherwise
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isCollaborator(@NonNull UUID boardId) {
        return isCollaborator(currentUserId(), boardId);
    }

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isCollaborator(@NonNull String requestUserId, @NonNull UUID boardId) {
        boolean requestUserIsCollaborator =
                boardUserRepository.existsByBoardIdAndUserId(boardId, requestUserId);
        if (!requestUserIsCollaborator) {
            log.warn(
                    "Access denied: User {} is not a collaborator on board {}",
                    requestUserId,
                    boardId);
            throw new ForbiddenException("Not a collaborator on this board");
        }
        return true;
    }

    /**
     * Checks if the current user has admin privileges on the specified board. Only users with the
     * ADMIN role can perform administrative actions.
     *
     * @param boardId the ID of the board to check
     * @return true if the user is an admin, false otherwise
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isAdmin(@NonNull UUID boardId) {
        String requestUserId = currentUserId();
        boolean requestUserIsAdmin =
                boardUserRepository.existsByBoardIdAndUserIdAndRole(
                        boardId, requestUserId, BoardRole.ADMIN);
        if (!requestUserIsAdmin) {
            log.warn("Access denied: User {} is not an admin on board {}", requestUserId, boardId);
            throw new ForbiddenException("Admin privileges required");
        }
        return requestUserIsAdmin;
    }

    /**
     * Checks if the current user is either an admin collaborator or the creator of the board.
     *
     * @param boardId the ID of the board to check
     * @return true if the user is admin or creator
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isAdminOrCreator(@NonNull UUID boardId) {
        String requestUserId = currentUserId();
        boolean requestUserIsAdmin =
                boardUserRepository.existsByBoardIdAndUserIdAndRole(
                        boardId, requestUserId, BoardRole.ADMIN);
        if (requestUserIsAdmin) {
            return true;
        }

        boolean requestUserIsCreator =
                boardRepository.existsByIdAndCreatedById(boardId, requestUserId);
        if (!requestUserIsCreator) {
            log.warn(
                    "Access denied: User {} is neither admin nor creator on board {}",
                    requestUserId,
                    boardId);
            throw new ForbiddenException("Admin or creator privileges required");
        }
        return true;
    }

    /**
     * Retrieves whether the current user is the creator of the specified board.
     *
     * @param boardId the ID of the board to check
     * @return "true" if the user is the creator, "false" otherwise
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isCreator(@NonNull UUID boardId) {
        String requestUserId = currentUserId();
        boolean requestUserIsCreator =
                boardRepository.existsByIdAndCreatedById(boardId, requestUserId);
        if (!requestUserIsCreator) {
            log.warn(
                    "Access denied: User {} is not the creator of board {}",
                    requestUserId,
                    boardId);
            throw new ForbiddenException("Only the creator can perform this action");
        }
        return requestUserIsCreator;
    }
}
