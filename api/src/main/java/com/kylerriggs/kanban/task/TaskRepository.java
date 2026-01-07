package com.kylerriggs.kanban.task;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    /**
     * Finds a task by ID with a pessimistic write lock to prevent concurrent modifications.
     *
     * @param taskId the ID of the task
     * @return the task wrapped in an Optional
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Task t WHERE t.id = :taskId")
    Optional<Task> findByIdWithLock(@Param("taskId") UUID taskId);

    /**
     * Finds the maximum position value among tasks in the specified board.
     *
     * @param boardId the ID of the board
     * @return the maximum position value, or -1 if there are no tasks in the board
     */
    @Query("SELECT COALESCE(MAX(t.position), -1) FROM Task t WHERE t.board.id = :boardId")
    Integer findMaxPositionByBoardId(@Param("boardId") UUID boardId);

    /**
     * Decrements the position of all tasks in a column that have a position greater than the
     * specified threshold. Used when removing a task or moving it to another column.
     *
     * @param columnId the column ID
     * @param positionThreshold only tasks with position > threshold will be updated
     * @return the number of tasks updated
     */
    @Modifying
    @Query(
            "UPDATE Task t SET t.position = t.position - 1 WHERE t.column.id = :columnId AND"
                    + " t.position > :positionThreshold")
    int decrementPositionsAfter(
            @Param("columnId") UUID columnId,
            @Param("positionThreshold") Integer positionThreshold);

    /**
     * Increments the position of all tasks in a column that have a position greater than or equal
     * to the specified threshold. Used when inserting a task at a specific position.
     *
     * @param columnId the column ID
     * @param positionThreshold only tasks with position >= threshold will be updated
     * @return the number of tasks updated
     */
    @Modifying
    @Query(
            "UPDATE Task t SET t.position = t.position + 1 WHERE t.column.id = :columnId AND"
                    + " t.position >= :positionThreshold")
    int incrementPositionsFrom(
            @Param("columnId") UUID columnId,
            @Param("positionThreshold") Integer positionThreshold);

    /**
     * Decrements positions of tasks in a range (used when moving a task down within the same
     * column).
     *
     * @param columnId the column ID
     * @param minPosition the minimum position (exclusive)
     * @param maxPosition the maximum position (inclusive)
     * @return the number of tasks updated
     */
    @Modifying
    @Query(
            "UPDATE Task t SET t.position = t.position - 1 WHERE t.column.id = :columnId AND"
                    + " t.position > :minPosition AND t.position <= :maxPosition")
    int decrementPositionsInRange(
            @Param("columnId") UUID columnId,
            @Param("minPosition") Integer minPosition,
            @Param("maxPosition") Integer maxPosition);

    /**
     * Increments positions of tasks in a range (used when moving a task up within the same column).
     *
     * @param columnId the column ID
     * @param minPosition the minimum position (inclusive)
     * @param maxPosition the maximum position (exclusive)
     * @return the number of tasks updated
     */
    @Modifying
    @Query(
            "UPDATE Task t SET t.position = t.position + 1 WHERE t.column.id = :columnId AND"
                    + " t.position >= :minPosition AND t.position < :maxPosition")
    int incrementPositionsInRange(
            @Param("columnId") UUID columnId,
            @Param("minPosition") Integer minPosition,
            @Param("maxPosition") Integer maxPosition);

    /**
     * Checks whether the given user is authorized for the task's board. The query returns true if
     * the user is either the board creator or a collaborator (exists in BoardUser for that board).
     * This is implemented as a single DB query and does not load entity relations.
     *
     * @param taskId the task id to check
     * @param userId the user id to check
     * @return true if the user is the board owner or a collaborator for the task's board
     */
    @Query(
            "SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END FROM Task t WHERE t.id ="
                    + " :taskId AND (t.board.createdBy.id = :userId OR EXISTS (SELECT 1 FROM BoardUser"
                    + " bu WHERE bu.board.id = t.board.id AND bu.user.id = :userId))")
    boolean isUserAuthorizedForTask(@Param("taskId") UUID taskId, @Param("userId") String userId);

    List<Task> findByBoardId(UUID boardId);
}
