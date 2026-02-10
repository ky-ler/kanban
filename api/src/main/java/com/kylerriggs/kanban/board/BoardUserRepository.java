package com.kylerriggs.kanban.board;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BoardUserRepository extends JpaRepository<BoardUser, BoardUserId> {
    /**
     * Checks if the user is a collaborator on the specified board.
     *
     * @param boardId the board ID to check
     * @param userId the user ID to match
     * @return true if the board has the user as a collaborator
     */
    boolean existsByBoardIdAndUserId(UUID boardId, String userId);

    /**
     * Checks if the user has a specific role on the specified board.
     *
     * @param boardId the board ID to check
     * @param userId the user ID to match
     * @param role the role to verify
     * @return true if the user has the given role on the board
     */
    boolean existsByBoardIdAndUserIdAndRole(UUID boardId, String userId, BoardRole role);

    /**
     * Finds the board collaborator record for the user.
     *
     * @param boardId the board ID to match
     * @param userId the user ID to match
     * @return the board-user link if it exists
     */
    Optional<BoardUser> findByBoardIdAndUserId(UUID boardId, String userId);
}
