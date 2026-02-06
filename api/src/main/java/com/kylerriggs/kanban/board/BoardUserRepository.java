package com.kylerriggs.kanban.board;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BoardUserRepository extends JpaRepository<BoardUser, BoardUserId> {
    boolean existsByBoardIdAndUserId(UUID boardId, String userId);

    boolean existsByBoardIdAndUserIdAndRole(UUID boardId, String userId, BoardRole role);

    Optional<BoardUser> findByBoardIdAndUserId(UUID boardId, String userId);
}
