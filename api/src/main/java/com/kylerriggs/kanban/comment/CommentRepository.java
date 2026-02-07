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
        UUID getTaskId();

        long getCommentCount();
    }

    List<Comment> findByTaskIdOrderByDateCreatedAsc(UUID taskId);

    @Query(
            "SELECT c.task.id AS taskId, COUNT(c) AS commentCount FROM Comment c WHERE c.task.id IN"
                    + " :taskIds GROUP BY c.task.id")
    List<TaskCommentCount> countByTaskIds(@Param("taskIds") List<UUID> taskIds);

    void deleteByTaskId(UUID taskId);
}
