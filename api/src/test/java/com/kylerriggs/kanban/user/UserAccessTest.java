package com.kylerriggs.kanban.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.exception.ForbiddenException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class UserAccessTest {

    private static final String CURRENT_USER_ID = "auth0|current-user-123";
    private static final String OTHER_USER_ID = "auth0|other-user-456";

    @Mock private UserRepository userRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;
    @InjectMocks private UserAccess userAccess;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    private void setupAuthentication(String userId) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(userId);
    }

    @Nested
    class CanModify {

        @Test
        void canModify_WhenUserModifiesSelf_ReturnsTrue() {
            // Given
            setupAuthentication(CURRENT_USER_ID);
            when(userRepository.existsById(CURRENT_USER_ID)).thenReturn(true);

            // When
            boolean result = userAccess.canModify(CURRENT_USER_ID);

            // Then
            assertTrue(result);
            verify(userRepository).existsById(CURRENT_USER_ID);
        }

        @Test
        void canModify_WhenUserModifiesDifferentUser_ThrowsForbiddenException() {
            // Given
            setupAuthentication(CURRENT_USER_ID);
            when(userRepository.existsById(OTHER_USER_ID)).thenReturn(true);

            // When & Then
            ForbiddenException exception =
                    assertThrows(
                            ForbiddenException.class, () -> userAccess.canModify(OTHER_USER_ID));
            assertEquals("You may not modify this user", exception.getMessage());
            verify(userRepository).existsById(OTHER_USER_ID);
        }

        @Test
        void canModify_WhenUserDoesNotExist_ThrowsForbiddenException() {
            // Given
            setupAuthentication(CURRENT_USER_ID);
            when(userRepository.existsById(CURRENT_USER_ID)).thenReturn(false);

            // When & Then
            ForbiddenException exception =
                    assertThrows(
                            ForbiddenException.class, () -> userAccess.canModify(CURRENT_USER_ID));
            assertEquals("You may not modify this user", exception.getMessage());
            verify(userRepository).existsById(CURRENT_USER_ID);
        }

        @Test
        void canModify_WhenDifferentUserDoesNotExist_ThrowsForbiddenException() {
            // Given
            setupAuthentication(CURRENT_USER_ID);
            when(userRepository.existsById(OTHER_USER_ID)).thenReturn(false);

            // When & Then
            ForbiddenException exception =
                    assertThrows(
                            ForbiddenException.class, () -> userAccess.canModify(OTHER_USER_ID));
            assertEquals("You may not modify this user", exception.getMessage());
            verify(userRepository).existsById(OTHER_USER_ID);
        }

        @Test
        void canModify_WhenNotAuthenticated_ThrowsIllegalStateException() {
            // Given
            when(securityContext.getAuthentication()).thenReturn(null);

            // When & Then
            IllegalStateException exception =
                    assertThrows(
                            IllegalStateException.class,
                            () -> userAccess.canModify(CURRENT_USER_ID));
            assertEquals("User is not authenticated", exception.getMessage());
            verify(userRepository, never()).existsById(any());
        }

        @Test
        void canModify_WhenAuthenticationNotAuthenticated_ThrowsIllegalStateException() {
            // Given
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(false);

            // When & Then
            IllegalStateException exception =
                    assertThrows(
                            IllegalStateException.class,
                            () -> userAccess.canModify(CURRENT_USER_ID));
            assertEquals("User is not authenticated", exception.getMessage());
            verify(userRepository, never()).existsById(any());
        }
    }
}
