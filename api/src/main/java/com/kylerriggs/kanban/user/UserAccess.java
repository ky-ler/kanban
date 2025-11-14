package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.common.BaseAccess;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

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
    public boolean canModify(String userId) {
        String requestUserId = currentUserId();
        return requestUserId.equals(userId) && userRepository.existsById(userId);
    }
}
