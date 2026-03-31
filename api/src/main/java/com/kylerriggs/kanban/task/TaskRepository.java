package com.kylerriggs.kanban.task;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    /**
     * Finds all non-archived tasks assigned to a user, across all non-archived boards where the
     * user is a collaborator. Authorization is baked into the query. Results are ordered by due
     * date (nulls last) then by most recently modified.
     *
     * @param userId the user ID to match as assignee
     * @param priorities optional list of priority values to filter by (pass null or empty to skip)
     * @param filterByPriority whether to apply the priority filter
     * @return list of tasks assigned to the user
     */
    @Query(
            """
            SELECT t FROM Task t
            JOIN FETCH t.board b
            JOIN FETCH t.column c
            LEFT JOIN FETCH t.labels
            LEFT JOIN FETCH t.assignedTo
            LEFT JOIN FETCH t.createdBy
            WHERE t.assignedTo.id = :userId
              AND t.isArchived = false
              AND b.isArchived = false
              AND (:filterByPriority = false OR t.priority IN :priorities)
              AND EXISTS (
                  SELECT 1 FROM BoardUser bu
                  WHERE bu.board.id = b.id AND bu.user.id = :userId
              )
            ORDER BY t.dueDate ASC NULLS LAST, t.dateModified DESC
            """)
    List<Task> findAssignedTasksForUser(
            @Param("userId") String userId,
            @Param("priorities") List<Priority> priorities,
            @Param("filterByPriority") boolean filterByPriority);

    /**
     * Finds a task by ID and board ID for authorization or scoped lookups.
     *
     * @param taskId the task ID to match
     * @param boardId the board ID to match
     * @return the task if it belongs to the board
     */
    Optional<Task> findByIdAndBoardId(UUID taskId, UUID boardId);

    /**
     * Checks whether a task exists within the specified board.
     *
     * @param taskId the task ID to check
     * @param boardId the board ID to match
     * @return true if the task exists on the board
     */
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
     * Finds the position of a task in a specific column.
     *
     * @param taskId the task ID
     * @param columnId the column ID
     * @return the task position if the task exists in the column, otherwise an empty Optional
     */
    @Query("SELECT t.position FROM Task t WHERE t.id = :taskId AND t.column.id =" + " :columnId")
    Optional<Long> findPositionByIdAndColumnId(
            @Param("taskId") UUID taskId, @Param("columnId") UUID columnId);

    @Query(
            "SELECT t.position FROM Task t WHERE t.id = :taskId AND t.column.id = :columnId AND"
                    + " t.isArchived = false")
    Optional<Long> findActivePositionByIdAndColumnId(
            @Param("taskId") UUID taskId, @Param("columnId") UUID columnId);

    /**
     * Finds the maximum position value among tasks in the specified column.
     *
     * @param columnId the ID of the column
     * @return the maximum position value, or null if there are no tasks in the column
     */
    @Query("SELECT MAX(t.position) FROM Task t WHERE t.column.id = :columnId")
    Optional<Long> findMaxPositionByColumnId(@Param("columnId") UUID columnId);

    @Query(
            "SELECT MAX(t.position) FROM Task t WHERE t.column.id = :columnId AND t.isArchived ="
                    + " false")
    Optional<Long> findMaxPositionByColumnIdAndIsArchivedFalse(@Param("columnId") UUID columnId);

    /**
     * Finds all task IDs and positions in a column, ordered by position. Used for rebalancing.
     *
     * @param columnId the column ID
     * @return list of tasks ordered by position
     */
    @Query("SELECT t FROM Task t WHERE t.column.id = :columnId ORDER BY t.position")
    List<Task> findByColumnIdOrderByPosition(@Param("columnId") UUID columnId);

    @Query(
            "SELECT t FROM Task t WHERE t.column.id = :columnId AND t.isArchived = false ORDER BY"
                    + " t.position")
    List<Task> findByColumnIdAndIsArchivedFalseOrderByPosition(@Param("columnId") UUID columnId);

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

    /**
     * Finds all tasks for a board.
     *
     * @param boardId the board ID to match
     * @return list of tasks for the board
     */
    List<Task> findByBoardId(UUID boardId);

    long countByColumnIdAndIsArchivedTrue(UUID columnId);

    long countByBoardIdAndIsArchivedFalse(UUID boardId);

    long countByColumnIdAndIsArchivedFalse(UUID columnId);

    void deleteByColumnId(UUID columnId);

    @Modifying
    @Query(
            "UPDATE Task t SET t.isArchived = true, t.dateModified = :dateModified WHERE t.board.id"
                    + " = :boardId AND t.isArchived = false")
    int archiveByBoardId(
            @Param("boardId") UUID boardId, @Param("dateModified") Instant dateModified);

    @Modifying
    @Query(
            "UPDATE Task t SET t.isArchived = true, t.dateModified = :dateModified WHERE"
                    + " t.column.id = :columnId AND t.isArchived = false")
    int archiveByColumnId(
            @Param("columnId") UUID columnId, @Param("dateModified") Instant dateModified);
}
