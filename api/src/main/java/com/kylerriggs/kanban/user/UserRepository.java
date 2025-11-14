package com.kylerriggs.kanban.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u.defaultBoard.id FROM User u WHERE u.id = :userId")
    UUID findDefaultBoardIdById(@Param("userId") String userId);
}
