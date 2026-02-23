package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.exception.ResourceNotFoundException;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserLookupService {
    private final UserRepository userRepository;
    private final UserService userService;

    public UserLookupService(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public User getRequiredCurrentUser() {
        return getRequiredUser(userService.getCurrentUserId());
    }

    @Transactional(readOnly = true)
    public User getRequiredUser(@NonNull String userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }
}
