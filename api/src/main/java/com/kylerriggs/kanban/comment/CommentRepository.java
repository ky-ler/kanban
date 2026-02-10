package com.kylerriggs.kanban.comment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    interface TaskCommentCount {
        /**
         * @return the task ID for the count row
         */
        UUID getTaskId();

        /**
         * @return the number of comments for the task
         */
        long getCommentCount();
    }

    /**
     * Finds comments for a task ordered by oldest first.
     *
     * @param taskId the task ID to match
     * @return list of comments for the task
     */
    List<Comment> findByTaskIdOrderByDateCreatedAsc(UUID taskId);

    /**
     * Counts comments for each task ID provided.
     *
     * @param taskIds the task IDs to count comments for
     * @return list of comment counts by task ID
     */
    @Query(
            "SELECT c.task.id AS taskId, COUNT(c) AS commentCount FROM Comment c WHERE c.task.id IN"
                    + " :taskIds GROUP BY c.task.id")
    List<TaskCommentCount> countByTaskIds(@Param("taskIds") List<UUID> taskIds);

    /**
     * Deletes all comments for the given task.
     *
     * @param taskId the task ID to delete comments for
     */
    void deleteByTaskId(UUID taskId);
}
