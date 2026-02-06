package com.kylerriggs.kanban.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class UserSynchronizerTest {

    private static final String USER_ID = "auth0|user123";
    private static final String EMAIL = "test@example.com";
    private static final String USERNAME = "testuser";
    private static final String PROFILE_IMAGE_URL = "https://example.com/image.png";

    @Mock private UserRepository userRepository;
    @Mock private UserMapper userMapper;
    @InjectMocks private UserSynchronizer userSynchronizer;

    private Jwt jwt;
    private User user;

    @BeforeEach
    void setUp() {
        jwt = createJwt(USER_ID, EMAIL, USERNAME, PROFILE_IMAGE_URL);

        user = new User();
        user.setId(USER_ID);
        user.setEmail(EMAIL);
        user.setUsername(USERNAME);
        user.setProfileImageUrl(PROFILE_IMAGE_URL);
    }

    private Jwt createJwt(String subject, String email, String username, String picture) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject(subject)
                .claim("https://example.com/claims/email", email)
                .claim("https://example.com/claims/username", username)
                .claim("https://example.com/claims/picture", picture)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    @Nested
    class NewUserTests {
        @Test
        void syncWithIdp_WhenNewUser_CreatesUser() {
            // Given
            when(userMapper.mapUserFromToken(jwt)).thenReturn(user);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
            when(userRepository.save(Objects.requireNonNull(user))).thenReturn(user);

            // When
            userSynchronizer.syncWithIdp(jwt);

            // Then
            verify(userRepository).findByEmail(EMAIL);
            verify(userRepository).save(Objects.requireNonNull(user));
        }

        @Test
        void syncWithIdp_WhenRaceCondition_FetchesExistingUser() {
            // Given
            User existingUser = new User();
            existingUser.setId(USER_ID);
            existingUser.setEmail(EMAIL);
            existingUser.setUsername(USERNAME);

            when(userMapper.mapUserFromToken(jwt)).thenReturn(user);
            when(userRepository.findByEmail(EMAIL))
                    .thenReturn(Optional.empty())
                    .thenReturn(Optional.of(existingUser));
            when(userRepository.save(Objects.requireNonNull(user)))
                    .thenThrow(new DataIntegrityViolationException("Duplicate key"));
            when(userRepository.save(existingUser)).thenReturn(existingUser);

            // When
            userSynchronizer.syncWithIdp(jwt);

            // Then
            verify(userRepository, times(2)).findByEmail(EMAIL);
            verify(userMapper).updateUserFromToken(existingUser, jwt);
            verify(userRepository).save(existingUser);
        }

        @Test
        void syncWithIdp_WhenRaceConditionAndUserNotFound_ThrowsIllegalStateException() {
            // Given
            when(userMapper.mapUserFromToken(jwt)).thenReturn(user);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
            when(userRepository.save(Objects.requireNonNull(user)))
                    .thenThrow(new DataIntegrityViolationException("Duplicate key"));

            // When & Then
            assertThrows(IllegalStateException.class, () -> userSynchronizer.syncWithIdp(jwt));
        }
    }

    @Nested
    class ExistingUserTests {
        @Test
        void syncWithIdp_WhenExistingUser_UpdatesUser() {
            // Given
            User existingUser = new User();
            existingUser.setId(USER_ID);
            existingUser.setEmail(EMAIL);
            existingUser.setUsername("oldusername");
            existingUser.setProfileImageUrl("https://example.com/old.png");

            when(userMapper.mapUserFromToken(jwt)).thenReturn(user);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existingUser));
            when(userRepository.save(existingUser)).thenReturn(existingUser);

            // When
            userSynchronizer.syncWithIdp(jwt);

            // Then
            verify(userMapper).updateUserFromToken(existingUser, jwt);
            verify(userRepository).save(existingUser);
        }
    }

    @Nested
    class MissingClaimsTests {
        @Test
        void syncWithIdp_WhenMissingEmail_SkipsSync() {
            // Given
            User userWithoutEmail = new User();
            userWithoutEmail.setId(USER_ID);
            userWithoutEmail.setEmail(null);

            when(userMapper.mapUserFromToken(jwt)).thenReturn(userWithoutEmail);

            // When
            userSynchronizer.syncWithIdp(jwt);

            // Then
            verify(userRepository, never()).findByEmail(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        void syncWithIdp_WhenEmptyEmail_SkipsSync() {
            // Given
            User userWithEmptyEmail = new User();
            userWithEmptyEmail.setId(USER_ID);
            userWithEmptyEmail.setEmail("");

            when(userMapper.mapUserFromToken(jwt)).thenReturn(userWithEmptyEmail);

            // When
            userSynchronizer.syncWithIdp(jwt);

            // Then
            verify(userRepository, never()).findByEmail(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        void syncWithIdp_WhenBlankEmail_SkipsSync() {
            // Given
            User userWithBlankEmail = new User();
            userWithBlankEmail.setId(USER_ID);
            userWithBlankEmail.setEmail("   ");

            when(userMapper.mapUserFromToken(jwt)).thenReturn(userWithBlankEmail);

            // When
            userSynchronizer.syncWithIdp(jwt);

            // Then
            verify(userRepository, never()).findByEmail(any());
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    class DifferentSubjectsTests {
        @Test
        void syncWithIdp_WithDifferentSubject_UsesCorrectSubject() {
            // Given
            String differentSubject = "auth0|different456";
            Jwt differentJwt = createJwt(differentSubject, EMAIL, USERNAME, PROFILE_IMAGE_URL);

            User differentUser = new User();
            differentUser.setId(differentSubject);
            differentUser.setEmail(EMAIL);
            differentUser.setUsername(USERNAME);
            differentUser.setProfileImageUrl(PROFILE_IMAGE_URL);

            when(userMapper.mapUserFromToken(differentJwt)).thenReturn(differentUser);
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
            when(userRepository.save(differentUser)).thenReturn(differentUser);

            // When
            userSynchronizer.syncWithIdp(differentJwt);

            // Then
            verify(userRepository).save(differentUser);
            assertEquals(differentSubject, differentUser.getId());
        }
    }
}
