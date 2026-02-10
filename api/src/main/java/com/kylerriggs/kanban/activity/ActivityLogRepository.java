package com.kylerriggs.kanban.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    /**
     * Finds activity log entries for a task ordered by newest first.
     *
     * @param taskId the task ID to match
     * @return list of activity logs for the task
     */
    List<ActivityLog> findByTaskIdOrderByDateCreatedDesc(UUID taskId);

    /**
     * Deletes all activity log entries for the given task.
     *
     * @param taskId the task ID to delete logs for
     */
    void deleteByTaskId(UUID taskId);
}
