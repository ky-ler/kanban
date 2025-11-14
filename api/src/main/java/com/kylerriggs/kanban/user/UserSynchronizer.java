package com.kylerriggs.kanban.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSynchronizer {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /**
     * Synchronizes user information from the identity provider (Auth0) JWT token.
     * Creates a new user if they don't exist, or updates existing user information.
     * Skips synchronization if the token doesn't contain an email.
     *
     * @param token the JWT token containing user claims from Auth0
     */
    public void syncWithIdp(Jwt token) {
        log.info("Synchronizing user with idp");

        User user = userMapper.mapUserFromToken(token);
        if (!StringUtils.hasText(user.getEmail())) {
            return;
        }

        Optional<User> optionalUser = userRepository.findByEmail(user.getEmail());
        if (optionalUser.isPresent()) {
            userMapper.updateUserFromToken(optionalUser.get(), token);
        } else {
            log.info("Creating new user with email: {}", user.getEmail());
            userRepository.save(user);
        }
    }
}
