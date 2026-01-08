package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ForbiddenException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component("userAccess")
@AllArgsConstructor
@Slf4j
public class UserAccess extends BaseAccess {
    private final UserRepository userRepository;

    /**
     * Checks if the current authenticated user is the same as the specified user.
     *
     * @param userId the ID of the user to check modification rights for
     * @return true if the current user matches the specified user and exists, false otherwise
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean canModify(@NonNull String userId) {
        String requestUserId = currentUserId();
        boolean requestUserExists = userRepository.existsById(userId);
        boolean requestUserCanModify = requestUserId.equals(userId) && requestUserExists;
        if (!requestUserCanModify) {
            log.warn("Access denied: User {} cannot modify user {}", requestUserId, userId);
            throw new ForbiddenException("You may not modify this user");
        }
        return true;
    }
}
