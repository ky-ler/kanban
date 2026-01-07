package com.kylerriggs.kanban.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSynchronizer {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    /**
     * Synchronizes user information from the identity provider (Auth0) JWT token. Creates a new
     * user if they don't exist, or updates existing user information. Skips synchronization if the
     * token doesn't contain an email.
     *
     * <p>This method is cached to avoid unnecessary database queries on every request. Cache TTL is
     * configured in CacheConfig. The cache is synchronized to prevent concurrent threads from
     * executing the method for the same cache key.
     *
     * <p>Race condition protection: If multiple requests for a new user arrive simultaneously, the
     * duplicate key exception is caught and the existing user is fetched instead.
     *
     * @param token the JWT token containing user claims from Auth0
     */
    @Cacheable(value = "userSync", key = "#token.subject", sync = true)
    @Transactional
    public void syncWithIdp(Jwt token) {
        log.debug("Synchronizing user with idp for subject: {}", token.getSubject());

        User user = userMapper.mapUserFromToken(token);
        if (!StringUtils.hasText(user.getEmail())) {
            log.warn(
                    "Token missing email claim, skipping sync for subject: {}", token.getSubject());
            return;
        }

        Optional<User> optionalUser = userRepository.findByEmail(user.getEmail());
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            userMapper.updateUserFromToken(existingUser, token);
            userRepository.save(existingUser);
            log.debug("Updated existing user: {}", existingUser.getEmail());
        } else {
            try {
                log.info("Creating new user with email: {}", user.getEmail());
                userRepository.save(user);
            } catch (DataIntegrityViolationException e) {
                // Race condition: Another request created this user simultaneously
                // Fetch the user that was just created by the other request
                log.warn(
                        "Duplicate user creation detected for email: {}, fetching existing user",
                        user.getEmail());
                User existingUser =
                        userRepository
                                .findByEmail(user.getEmail())
                                .orElseThrow(
                                        () ->
                                                new IllegalStateException(
                                                        "User should exist but was not found: "
                                                                + user.getEmail()));
                userMapper.updateUserFromToken(existingUser, token);
                userRepository.save(existingUser);
            }
        }
    }
}
