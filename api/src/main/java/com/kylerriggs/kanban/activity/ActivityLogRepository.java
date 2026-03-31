package com.kylerriggs.kanban.activity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    /**
     * Finds paginated activity log entries for a task ordered by newest first.
     *
     * @param taskId the task ID to match
     * @param pageable pagination parameters
     * @return page of activity logs for the task
     */
    Page<ActivityLog> findByTaskIdOrderByDateCreatedDesc(UUID taskId, Pageable pageable);

    /**
     * Finds paginated activity log entries for a board (across all tasks), ordered by newest first.
     *
     * @param boardId the board ID to match via the task's board
     * @param pageable pagination parameters
     * @return page of activity logs for the board
     */
    Page<ActivityLog> findByTaskBoardIdOrderByDateCreatedDesc(UUID boardId, Pageable pageable);

    /**
     * Deletes all activity log entries for the given task.
     *
     * @param taskId the task ID to delete logs for
     */
    void deleteByTaskId(UUID taskId);
}
