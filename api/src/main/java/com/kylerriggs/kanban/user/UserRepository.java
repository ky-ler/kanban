package com.kylerriggs.kanban.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    /**
     * Finds a user by email address.
     *
     * @param email the email to match
     * @return the user if found
     */
    Optional<User> findByEmail(String email);
}
