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
    Optional<Task> findByIdAndBoardId(UUID taskId, UUID boardId);

    boolean existsByIdAndBoardId(UUID taskId, UUID boardId);

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
    @Query("SELECT COALESCE(MAX(t.position), -1L) FROM Task t WHERE t.board.id = :boardId")
    Long findMaxPositionByBoardId(@Param("boardId") UUID boardId);

    /**
     * Finds the position of a task by its ID.
     *
     * @param taskId the task ID
     * @return the position value
     */
    @Query("SELECT t.position FROM Task t WHERE t.id = :taskId")
    Optional<Long> findPositionById(@Param("taskId") UUID taskId);

    /**
     * Finds the maximum position value among tasks in the specified column.
     *
     * @param columnId the ID of the column
     * @return the maximum position value, or null if there are no tasks in the column
     */
    @Query("SELECT MAX(t.position) FROM Task t WHERE t.column.id = :columnId")
    Optional<Long> findMaxPositionByColumnId(@Param("columnId") UUID columnId);

    /**
     * Finds all task IDs and positions in a column, ordered by position. Used for rebalancing.
     *
     * @param columnId the column ID
     * @return list of tasks ordered by position
     */
    @Query("SELECT t FROM Task t WHERE t.column.id = :columnId ORDER BY t.position")
    List<Task> findByColumnIdOrderByPosition(@Param("columnId") UUID columnId);

    /**
     * Updates a single task's position.
     *
     * @param taskId the task ID
     * @param position the new position
     */
    @Modifying
    @Query("UPDATE Task t SET t.position = :position WHERE t.id = :taskId")
    void updatePosition(@Param("taskId") UUID taskId, @Param("position") Long position);

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
