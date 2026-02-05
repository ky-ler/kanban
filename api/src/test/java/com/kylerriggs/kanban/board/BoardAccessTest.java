package com.kylerriggs.kanban.board;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.exception.ForbiddenException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Objects;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class BoardAccessTest {

    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");
    private static final String USER_ID = "auth0|user123";

    @Mock private BoardUserRepository boardUserRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;
    @InjectMocks private BoardAccess boardAccess;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    private void setupAuthentication(String userId) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(userId);
    }

    // isCollaborator tests

    @Test
    void isCollaborator_WhenUserIsCollaborator_ReturnsTrue() {
        // Given
        setupAuthentication(USER_ID);
        when(boardUserRepository.existsByBoardIdAndUserId(BOARD_ID, USER_ID)).thenReturn(true);

        // When
        boolean result = boardAccess.isCollaborator(Objects.requireNonNull(BOARD_ID));

        // Then
        assertTrue(result);
        verify(boardUserRepository).existsByBoardIdAndUserId(BOARD_ID, USER_ID);
    }

    @Test
    void isCollaborator_WhenUserIsNotCollaborator_ThrowsForbiddenException() {
        // Given
        setupAuthentication(USER_ID);
        when(boardUserRepository.existsByBoardIdAndUserId(BOARD_ID, USER_ID)).thenReturn(false);

        // When & Then
        assertThrows(
                ForbiddenException.class,
                () -> boardAccess.isCollaborator(Objects.requireNonNull(BOARD_ID)));
    }

    @Test
    void isCollaborator_WhenNotAuthenticated_ThrowsIllegalStateException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null);

        // When & Then
        assertThrows(
                IllegalStateException.class,
                () -> boardAccess.isCollaborator(Objects.requireNonNull(BOARD_ID)));
        verify(boardUserRepository, never()).existsByBoardIdAndUserId(any(), any());
    }

    @Test
    void isCollaborator_WhenAuthenticationNotAuthenticated_ThrowsIllegalStateException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false);

        // When & Then
        assertThrows(
                IllegalStateException.class,
                () -> boardAccess.isCollaborator(Objects.requireNonNull(BOARD_ID)));
    }

    // isAdmin tests

    @Test
    void isAdmin_WhenUserIsAdmin_ReturnsTrue() {
        // Given
        setupAuthentication(USER_ID);
        when(boardUserRepository.existsByBoardIdAndUserIdAndRole(
                        BOARD_ID, USER_ID, BoardRole.ADMIN))
                .thenReturn(true);

        // When
        boolean result = boardAccess.isAdmin(Objects.requireNonNull(BOARD_ID));

        // Then
        assertTrue(result);
        verify(boardUserRepository)
                .existsByBoardIdAndUserIdAndRole(BOARD_ID, USER_ID, BoardRole.ADMIN);
    }

    @Test
    void isAdmin_WhenUserIsMember_ThrowsForbiddenException() {
        // Given
        setupAuthentication(USER_ID);
        when(boardUserRepository.existsByBoardIdAndUserIdAndRole(
                        BOARD_ID, USER_ID, BoardRole.ADMIN))
                .thenReturn(false);

        // When & Then
        assertThrows(
                ForbiddenException.class,
                () -> boardAccess.isAdmin(Objects.requireNonNull(BOARD_ID)));
    }

    @Test
    void isAdmin_WhenUserIsNotCollaborator_ThrowsForbiddenException() {
        // Given
        setupAuthentication(USER_ID);
        when(boardUserRepository.existsByBoardIdAndUserIdAndRole(
                        BOARD_ID, USER_ID, BoardRole.ADMIN))
                .thenReturn(false);

        // When & Then
        assertThrows(
                ForbiddenException.class,
                () -> boardAccess.isAdmin(Objects.requireNonNull(BOARD_ID)));
    }

    @Test
    void isAdmin_WhenNotAuthenticated_ThrowsIllegalStateException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null);

        // When & Then
        assertThrows(
                IllegalStateException.class,
                () -> boardAccess.isAdmin(Objects.requireNonNull(BOARD_ID)));
        verify(boardUserRepository, never()).existsByBoardIdAndUserIdAndRole(any(), any(), any());
    }

    // isCreator tests

    @Test
    void isCreator_WhenUserIsCreator_ReturnsTrue() {
        // Given
        setupAuthentication(USER_ID);
        when(boardRepository.existsByIdAndCreatedById(BOARD_ID, USER_ID)).thenReturn(true);

        // When
        boolean result = boardAccess.isCreator(Objects.requireNonNull(BOARD_ID));

        // Then
        assertTrue(result);
        verify(boardRepository).existsByIdAndCreatedById(Objects.requireNonNull(BOARD_ID), USER_ID);
    }

    @Test
    void isCreator_WhenUserIsNotCreator_ThrowsForbiddenException() {
        // Given
        setupAuthentication(USER_ID);
        when(boardRepository.existsByIdAndCreatedById(BOARD_ID, USER_ID)).thenReturn(false);

        // When & Then
        assertThrows(
                ForbiddenException.class,
                () -> boardAccess.isCreator(Objects.requireNonNull(BOARD_ID)));
    }

    @Test
    void isCreator_WhenNotAuthenticated_ThrowsIllegalStateException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null);

        // When & Then
        assertThrows(
                IllegalStateException.class,
                () -> boardAccess.isCreator(Objects.requireNonNull(BOARD_ID)));
        verify(boardRepository, never()).existsByIdAndCreatedById(any(), any());
    }

    // Tests with different users

    @Test
    void isCollaborator_WithDifferentUserId_UsesCorrectUserId() {
        // Given
        String differentUserId = "auth0|differentUser456";
        setupAuthentication(differentUserId);
        when(boardUserRepository.existsByBoardIdAndUserId(BOARD_ID, differentUserId))
                .thenReturn(true);

        // When
        boolean result = boardAccess.isCollaborator(Objects.requireNonNull(BOARD_ID));

        // Then
        assertTrue(result);
        verify(boardUserRepository)
                .existsByBoardIdAndUserId(Objects.requireNonNull(BOARD_ID), differentUserId);
    }

    @Test
    void isAdmin_WithDifferentBoardId_UsesCorrectBoardId() {
        // Given
        UUID differentBoardId = UUID.fromString("cbfc2988-d933-4c13-a014-009e8b4d0fb5");
        setupAuthentication(USER_ID);
        when(boardUserRepository.existsByBoardIdAndUserIdAndRole(
                        differentBoardId, USER_ID, BoardRole.ADMIN))
                .thenReturn(true);

        // When
        boolean result = boardAccess.isAdmin(Objects.requireNonNull(differentBoardId));

        // Then
        assertTrue(result);
        verify(boardUserRepository)
                .existsByBoardIdAndUserIdAndRole(
                        Objects.requireNonNull(differentBoardId), USER_ID, BoardRole.ADMIN);
    }
}
