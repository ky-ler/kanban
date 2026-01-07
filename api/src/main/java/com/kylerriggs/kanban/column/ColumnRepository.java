package com.kylerriggs.kanban.column;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ColumnRepository extends JpaRepository<Column, UUID> {

    /**
     * Finds a column by ID with a pessimistic write lock to prevent concurrent modifications.
     *
     * @param columnId the ID of the column
     * @return the column wrapped in an Optional
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Column c WHERE c.id = :columnId")
    Optional<Column> findByIdWithLock(@Param("columnId") UUID columnId);

    /**
     * Finds the maximum position value among columns in the specified board.
     *
     * @param boardId the ID of the board
     * @return the maximum position value, or -1 if there are no columns in the board
     */
    @Query("SELECT COALESCE(MAX(c.position), -1) FROM Column c WHERE c.board.id = :boardId")
    int findMaxPositionByBoardId(@Param("boardId") UUID boardId);

    /**
     * Counts the number of columns in a board.
     *
     * @param boardId the ID of the board
     * @return the count of columns
     */
    @Query("SELECT COUNT(c) FROM Column c WHERE c.board.id = :boardId")
    long countByBoardId(@Param("boardId") UUID boardId);

    /**
     * Decrements the position of all columns in a board that have a position greater than the
     * specified threshold. Used when removing a column.
     *
     * @param boardId the board ID
     * @param positionThreshold only columns with position > threshold will be updated
     * @return the number of columns updated
     */
    @Modifying
    @Query(
            "UPDATE Column c SET c.position = c.position - 1 WHERE c.board.id = :boardId AND"
                    + " c.position > :positionThreshold")
    int decrementPositionsAfter(
            @Param("boardId") UUID boardId, @Param("positionThreshold") int positionThreshold);

    /**
     * Increments the position of all columns in a board that have a position greater than or equal
     * to the specified threshold. Used when inserting a column at a specific position.
     *
     * @param boardId the board ID
     * @param positionThreshold only columns with position >= threshold will be updated
     * @return the number of columns updated
     */
    @Modifying
    @Query(
            "UPDATE Column c SET c.position = c.position + 1 WHERE c.board.id = :boardId AND"
                    + " c.position >= :positionThreshold")
    int incrementPositionsFrom(
            @Param("boardId") UUID boardId, @Param("positionThreshold") int positionThreshold);

    /**
     * Decrements positions of columns in a range (used when moving a column down within the board).
     *
     * @param boardId the board ID
     * @param minPosition the minimum position (exclusive)
     * @param maxPosition the maximum position (inclusive)
     * @return the number of columns updated
     */
    @Modifying
    @Query(
            "UPDATE Column c SET c.position = c.position - 1 WHERE c.board.id = :boardId AND"
                    + " c.position > :minPosition AND c.position <= :maxPosition")
    int decrementPositionsInRange(
            @Param("boardId") UUID boardId,
            @Param("minPosition") int minPosition,
            @Param("maxPosition") int maxPosition);

    /**
     * Increments positions of columns in a range (used when moving a column up within the board).
     *
     * @param boardId the board ID
     * @param minPosition the minimum position (inclusive)
     * @param maxPosition the maximum position (exclusive)
     * @return the number of columns updated
     */
    @Modifying
    @Query(
            "UPDATE Column c SET c.position = c.position + 1 WHERE c.board.id = :boardId AND"
                    + " c.position >= :minPosition AND c.position < :maxPosition")
    int incrementPositionsInRange(
            @Param("boardId") UUID boardId,
            @Param("minPosition") int minPosition,
            @Param("maxPosition") int maxPosition);

    /**
     * Checks if any tasks exist in the specified column.
     *
     * @param columnId the column ID
     * @return true if at least one task exists in the column
     */
    @Query(
            "SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END FROM Task t WHERE t.column.id = :columnId")
    boolean hasTasksInColumn(@Param("columnId") UUID columnId);
}
