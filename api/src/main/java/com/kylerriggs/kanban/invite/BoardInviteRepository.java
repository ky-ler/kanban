package com.kylerriggs.kanban.invite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BoardInviteRepository extends JpaRepository<BoardInvite, UUID> {

    Optional<BoardInvite> findByCode(String code);

    @Query("SELECT i FROM BoardInvite i " + "LEFT JOIN FETCH i.board " + "WHERE i.code = :code")
    Optional<BoardInvite> findByCodeWithBoard(@Param("code") String code);

    @Query(
            "SELECT i FROM BoardInvite i "
                    + "LEFT JOIN FETCH i.board "
                    + "LEFT JOIN FETCH i.createdBy "
                    + "WHERE i.board.id = :boardId "
                    + "AND i.revoked = false "
                    + "ORDER BY i.dateCreated DESC")
    List<BoardInvite> findActiveByBoardId(@Param("boardId") UUID boardId);

    boolean existsByBoardIdAndCode(UUID boardId, String code);
}
