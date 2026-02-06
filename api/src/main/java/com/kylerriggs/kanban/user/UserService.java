package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.exception.UnauthorizedException;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    /**
     * Retrieves the ID of the currently authenticated user from the security context.
     *
     * @return the user ID from the authentication token
     */
    public String getCurrentUserId() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();

        if (userId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        return userId;
    }
}
