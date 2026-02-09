package com.kylerriggs.kanban.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.exception.UnauthorizedException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String USER_ID = "auth0|user123";

    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;
    @InjectMocks private UserService userService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    private void setupAuthentication(String userId) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(userId);
    }

    @Test
    void getCurrentUserId_WhenAuthenticated_ReturnsUserId() {
        // Given
        setupAuthentication(USER_ID);

        // When
        String result = userService.getCurrentUserId();

        // Then
        assertEquals(USER_ID, result);
    }

    @Test
    void getCurrentUserId_WhenNotAuthenticated_ThrowsUnauthorizedException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null);

        // When & Then
        assertThrows(UnauthorizedException.class, () -> userService.getCurrentUserId());
    }

    @Test
    void getCurrentUserId_WhenAnonymousUser_ThrowsUnauthorizedException() {
        // Given
        setupAuthentication("anonymousUser");

        // When & Then
        assertThrows(UnauthorizedException.class, () -> userService.getCurrentUserId());
    }
}
