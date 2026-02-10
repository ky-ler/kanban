package com.kylerriggs.kanban.invite;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BoardInviteRepository extends JpaRepository<BoardInvite, UUID> {

    /**
     * Finds an invite by its code.
     *
     * @param code the invite code to match
     * @return the invite if found
     */
    Optional<BoardInvite> findByCode(String code);

    /**
     * Finds an invite by code and eagerly loads its board.
     *
     * @param code the invite code to match
     * @return the invite with board loaded if found
     */
    @Query("SELECT i FROM BoardInvite i " + "LEFT JOIN FETCH i.board " + "WHERE i.code = :code")
    Optional<BoardInvite> findByCodeWithBoard(@Param("code") String code);

    /**
     * Finds an invite by code with a pessimistic write lock and eagerly loads its board.
     *
     * @param code the invite code to match
     * @return the invite with board loaded if found
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM BoardInvite i " + "LEFT JOIN FETCH i.board " + "WHERE i.code = :code")
    Optional<BoardInvite> findByCodeWithBoardForUpdate(@Param("code") String code);

    /**
     * Finds active (not revoked) invites for a board, with board and creator loaded.
     *
     * @param boardId the board ID to match
     * @return list of active invites ordered by newest first
     */
    @Query(
            "SELECT i FROM BoardInvite i "
                    + "LEFT JOIN FETCH i.board "
                    + "LEFT JOIN FETCH i.createdBy "
                    + "WHERE i.board.id = :boardId "
                    + "AND i.revoked = false "
                    + "ORDER BY i.dateCreated DESC")
    List<BoardInvite> findActiveByBoardId(@Param("boardId") UUID boardId);

    /**
     * Checks whether a board already has an invite with the given code.
     *
     * @param boardId the board ID to match
     * @param code the invite code to match
     * @return true if the code exists for the board
     */
    boolean existsByBoardIdAndCode(UUID boardId, String code);
}
