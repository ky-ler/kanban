package com.kylerriggs.velora.checklist;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, UUID> {

    /** Projection interface for checklist progress per task. */
    interface TaskChecklistProgress {
        UUID getTaskId();

        long getTotal();

        long getCompleted();
    }

    /**
     * Finds checklist items for a task ordered by position.
     *
     * @param taskId the task ID
     * @return list of checklist items ordered by position
     */
    List<ChecklistItem> findByTaskIdOrderByPositionAsc(UUID taskId);

    /**
     * Finds a checklist item by ID with its task eagerly loaded.
     *
     * @param itemId the checklist item ID
     * @return the checklist item with task loaded
     */
    @Query("SELECT ci FROM ChecklistItem ci JOIN FETCH ci.task WHERE ci.id = :itemId")
    Optional<ChecklistItem> findByIdWithTask(@Param("itemId") UUID itemId);

    /**
     * Counts total checklist items for a task.
     *
     * @param taskId the task ID
     * @return count of checklist items
     */
    long countByTaskId(UUID taskId);

    /**
     * Counts completed checklist items for a task.
     *
     * @param taskId the task ID
     * @return count of completed checklist items
     */
    long countByTaskIdAndIsCompletedTrue(UUID taskId);

    /**
     * Finds the maximum position value for items in a task.
     *
     * @param taskId the task ID
     * @return the maximum position or empty if no items exist
     */
    @Query("SELECT MAX(ci.position) FROM ChecklistItem ci WHERE ci.task.id = :taskId")
    Optional<Long> findMaxPositionByTaskId(@Param("taskId") UUID taskId);

    /**
     * Gets checklist progress (total and completed counts) for multiple tasks.
     *
     * @param taskIds the task IDs to get progress for
     * @return list of progress projections by task ID
     */
    @Query(
            "SELECT ci.task.id AS taskId, COUNT(ci) AS total, "
                    + "SUM(CASE WHEN ci.isCompleted = true THEN 1 ELSE 0 END) AS completed "
                    + "FROM ChecklistItem ci WHERE ci.task.id IN :taskIds GROUP BY ci.task.id")
    List<TaskChecklistProgress> getProgressByTaskIds(@Param("taskIds") List<UUID> taskIds);

    /**
     * Deletes all checklist items for a task.
     *
     * @param taskId the task ID
     */
    void deleteByTaskId(UUID taskId);
}
