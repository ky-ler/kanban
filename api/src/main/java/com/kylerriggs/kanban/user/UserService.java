package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.exception.UnauthorizedException;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
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
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }

        String userId = authentication.getName();

        if (userId == null || userId.isBlank() || "anonymousUser".equals(userId)) {
            throw new UnauthorizedException("User not authenticated");
        }

        return userId;
    }
}
