package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.common.BaseAccess;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("boardAccess")
@AllArgsConstructor
@Slf4j
public class BoardAccess extends BaseAccess {
    private final BoardUserRepository boardUserRepository;
    private final BoardRepository boardRepository;

    /**
     * Checks if the current user is a collaborator on the specified board.
     * This includes both admins and regular members.
     *
     * @param boardId the ID of the board to check
     * @return true if the user is a collaborator, false otherwise
     */
    public boolean isCollaborator(UUID boardId) {
        String requestUserId = currentUserId();
        return boardUserRepository.existsByBoardIdAndUserId(boardId, requestUserId);
    }

    /**
     * Checks if the current user has admin privileges on the specified board.
     * Only users with the ADMIN role can perform administrative actions.
     *
     * @param boardId the ID of the board to check
     * @return true if the user is an admin, false otherwise
     */
    public boolean isAdmin(UUID boardId) {
        String requestUserId = currentUserId();

        return boardUserRepository.existsByBoardIdAndUserIdAndRole(
                boardId, requestUserId, BoardRole.ADMIN
        );
    }

    /**
     * Retrieves whether the current user is the creator of the specified board.
     *
     * @param boardId the ID of the board to check
     * @return "true" if the user is the creator, "false" otherwise
     */
    public boolean isCreator(UUID boardId) {
        String requestUserId = currentUserId();
        return boardRepository.existsByIdAndCreatedById(boardId, requestUserId);
    }
}
