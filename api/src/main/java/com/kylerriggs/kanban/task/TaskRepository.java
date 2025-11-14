package com.kylerriggs.kanban.task;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    @Query("SELECT COALESCE(MAX(i.position), -1) FROM Task i WHERE i.board.id = :boardId")
    Integer findMaxPositionByBoardId(@Param("boardId") UUID boardId);

    /**
     * Checks whether the given user is authorized for the task's board.
     * The query returns true if the user is either the board creator or a collaborator
     * (exists in BoardUser for that board).
     * <p>
     * This is implemented as a single DB query and does not load entity relations.
     *
     * @param taskId the task id to check
     * @param userId the user id to check
     * @return true if the user is the board owner or a collaborator for the task's board
     */
    @Query("SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END FROM Task i " +
            "WHERE i.id = :taskId AND " +
            "(i.board.createdBy.id = :userId OR " +
            "EXISTS (SELECT 1 FROM BoardUser bu WHERE bu.board.id = i.board.id AND bu.user.id = :userId))")
    boolean isUserAuthorizedForTask(@Param("taskId") UUID taskId, @Param("userId") String userId);
}