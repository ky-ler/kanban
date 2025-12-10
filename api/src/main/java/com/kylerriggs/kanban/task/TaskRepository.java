package com.kylerriggs.kanban.task;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    /**
     * Finds the maximum position value among tasks in the specified board.
     *
     * @param boardId the ID of the board
     * @return the maximum position value, or -1 if there are no tasks in the board
     */
    @Query("SELECT COALESCE(MAX(t.position), -1) FROM Task t WHERE t.board.id = :boardId")
    Integer findMaxPositionByBoardId(@Param("boardId") UUID boardId);

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
