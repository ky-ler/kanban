package com.kylerriggs.kanban.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, UUID> {
    /**
     * Fetches all boards where the user is a collaborator, including tasks, columns, and assignees
     * to avoid N+1 queries.
     *
     * @param userId the user ID to filter collaborators by
     * @return all matching boards with task and column details hydrated
     */
    @Query(
            "SELECT DISTINCT p FROM Board p LEFT JOIN FETCH p.tasks i LEFT JOIN FETCH i.column LEFT"
                    + " JOIN FETCH i.assignedTo WHERE p.id IN (SELECT pu.board.id FROM BoardUser pu"
                    + " WHERE pu.user.id = :userId)")
    List<Board> findAllByCollaboratorsUserIdWithTasksAndColumn(@Param("userId") String userId);

    /**
     * Fetches a board by ID with collaborators, tasks, task creators, assignees, and columns.
     *
     * @param boardId the board ID to load
     * @return the board with related details, if found
     */
    @Query(
            "SELECT DISTINCT p FROM Board p "
                    + "LEFT JOIN FETCH p.collaborators c "
                    + "LEFT JOIN FETCH c.user "
                    + "LEFT JOIN FETCH p.tasks i "
                    + "LEFT JOIN FETCH i.createdBy "
                    + "LEFT JOIN FETCH i.assignedTo "
                    + "LEFT JOIN FETCH i.column "
                    + "WHERE p.id = :boardId")
    Optional<Board> findByIdWithDetails(@Param("boardId") UUID boardId);

    /**
     * Counts distinct boards where the user is a collaborator.
     *
     * @param userId the user ID to match collaborators by
     * @return the number of boards the user collaborates on
     */
    @Query("SELECT COUNT(DISTINCT p) FROM Board p JOIN p.collaborators c WHERE c.user.id = :userId")
    long countByCollaboratorsUserId(@Param("userId") String userId);

    /**
     * Checks whether a board exists with the provided ID and creator user ID.
     *
     * @param id the board ID to check
     * @param createdById the creator user ID to match
     * @return true if the board exists and is owned by the user
     */
    boolean existsByIdAndCreatedById(UUID id, String createdById);

    /**
     * Atomically updates the board's dateModified timestamp and increments its version. This avoids
     * loading the full board entity and prevents optimistic locking conflicts when multiple
     * operations modify related entities (tasks, columns) concurrently.
     *
     * @param boardId the ID of the board to update
     * @param dateModified the new modification timestamp
     */
    @Modifying
    @Query(
            "UPDATE Board b SET b.dateModified = :dateModified, b.version = b.version + 1 WHERE"
                    + " b.id = :boardId")
    void touchDateModified(
            @Param("boardId") UUID boardId, @Param("dateModified") Instant dateModified);
}
