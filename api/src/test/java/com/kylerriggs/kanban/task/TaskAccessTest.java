package com.kylerriggs.kanban.task;

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

import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class TaskAccessTest {

    private static final UUID TASK_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");
    private static final String USER_ID = "user123";
    @Mock private TaskRepository taskRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;
    @InjectMocks private TaskAccess taskAccess;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void isCollaborator_WhenUserIsOwner_ReturnsTrue() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(USER_ID);
        when(taskRepository.isUserAuthorizedForTask(TASK_ID, USER_ID)).thenReturn(true);

        // When
        boolean result = taskAccess.isCollaborator(TASK_ID);

        // Then
        assertTrue(result);
        verify(taskRepository).isUserAuthorizedForTask(TASK_ID, USER_ID);
    }

    @Test
    void isCollaborator_WhenUserIsCollaborator_ReturnsTrue() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(USER_ID);
        when(taskRepository.isUserAuthorizedForTask(TASK_ID, USER_ID)).thenReturn(true);

        // When
        boolean result = taskAccess.isCollaborator(TASK_ID);

        // Then
        assertTrue(result);
        verify(taskRepository).isUserAuthorizedForTask(TASK_ID, USER_ID);
    }

    @Test
    void isCollaborator_WhenUserIsNotMember_ThrowsForbiddenException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(USER_ID);
        when(taskRepository.isUserAuthorizedForTask(TASK_ID, USER_ID)).thenReturn(false);

        // When & Then
        assertThrows(ForbiddenException.class, () -> taskAccess.isCollaborator(TASK_ID));
        verify(taskRepository).isUserAuthorizedForTask(TASK_ID, USER_ID);
    }

    @Test
    void isCollaborator_WhenTaskDoesNotExist_ThrowsForbiddenException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(USER_ID);
        when(taskRepository.isUserAuthorizedForTask(TASK_ID, USER_ID)).thenReturn(false);

        // When & Then
        assertThrows(ForbiddenException.class, () -> taskAccess.isCollaborator(TASK_ID));
        verify(taskRepository).isUserAuthorizedForTask(TASK_ID, USER_ID);
    }

    @Test
    void isCollaborator_WhenUserIsNotAuthenticated_ThrowsException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null);

        // When & Then
        assertThrows(IllegalStateException.class, () -> taskAccess.isCollaborator(TASK_ID));
        verify(taskRepository, never()).isUserAuthorizedForTask(any(), any());
    }

    @Test
    void isCollaborator_WhenAuthenticationIsNotAuthenticated_ThrowsException() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false);

        // When & Then
        assertThrows(IllegalStateException.class, () -> taskAccess.isCollaborator(TASK_ID));
        verify(taskRepository, never()).isUserAuthorizedForTask(any(), any());
    }

    @Test
    void isCollaborator_WithDifferentUserId_UsesCorrectUserId() {
        // Given
        String differentUserId = "differentUser456";
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(differentUserId);
        when(taskRepository.isUserAuthorizedForTask(TASK_ID, differentUserId)).thenReturn(true);

        // When
        boolean result = taskAccess.isCollaborator(TASK_ID);

        // Then
        assertTrue(result);
        verify(taskRepository).isUserAuthorizedForTask(TASK_ID, differentUserId);
    }

    @Test
    void isCollaborator_WithDifferentTaskId_UsesCorrectTaskId() {
        // Given
        UUID differentTaskId = UUID.fromString("cbfc2988-d933-4c13-a014-009e8b4d0fb5");
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(USER_ID);
        when(taskRepository.isUserAuthorizedForTask(differentTaskId, USER_ID)).thenReturn(true);

        // When
        boolean result = taskAccess.isCollaborator(differentTaskId);

        // Then
        assertTrue(result);
        verify(taskRepository).isUserAuthorizedForTask(differentTaskId, USER_ID);
    }
}
