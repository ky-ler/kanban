package com.kylerriggs.kanban.board;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, UUID> {
    @Query("SELECT DISTINCT p FROM Board p " +
            "LEFT JOIN FETCH p.tasks i " +
            "LEFT JOIN FETCH i.column " +
            "LEFT JOIN FETCH i.assignedTo " +
            "WHERE p.id IN (SELECT pu.board.id FROM BoardUser pu WHERE pu.user.id = :userId)")
    List<Board> findAllByCollaboratorsUserIdWithTasksAndColumn(@Param("userId") String userId);

    @Query("SELECT DISTINCT p FROM Board p " +
            "LEFT JOIN FETCH p.collaborators c " +
            "LEFT JOIN FETCH c.user " +
            "LEFT JOIN FETCH p.tasks i " +
            "LEFT JOIN FETCH i.createdBy " +
            "LEFT JOIN FETCH i.assignedTo " +
            "LEFT JOIN FETCH i.column " +
            "WHERE p.id = :boardId")
    Optional<Board> findByIdWithDetails(@Param("boardId") UUID boardId);

    @Query("SELECT COUNT(DISTINCT p) FROM Board p JOIN p.collaborators c WHERE c.user.id = :userId")
    long countByCollaboratorsUserId(@Param("userId") String userId);

    boolean existsByIdAndCreatedById(UUID id, String createdById);
}
