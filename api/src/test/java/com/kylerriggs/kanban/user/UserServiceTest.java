package com.kylerriggs.kanban.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
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

import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String USER_ID = "auth0|user123";
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");

    @Mock private UserRepository userRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;
    @InjectMocks private UserService userService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    private void setupAuthentication(String userId) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
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
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn(null);

        // When & Then
        assertThrows(UnauthorizedException.class, () -> userService.getCurrentUserId());
    }

    @Test
    void getCurrentUserDefaultBoardId_WhenUserHasDefault_ReturnsBoardId() {
        // Given
        setupAuthentication(USER_ID);
        when(userRepository.findDefaultBoardIdById(USER_ID)).thenReturn(Optional.of(BOARD_ID));

        // When
        UUID result = userService.getCurrentUserDefaultBoardId();

        // Then
        assertEquals(BOARD_ID, result);
        verify(userRepository).findDefaultBoardIdById(USER_ID);
    }

    @Test
    void getCurrentUserDefaultBoardId_WhenUserHasNoDefault_ReturnsNull() {
        // Given
        setupAuthentication(USER_ID);
        when(userRepository.findDefaultBoardIdById(USER_ID)).thenReturn(Optional.empty());

        // When
        UUID result = userService.getCurrentUserDefaultBoardId();

        // Then
        assertNull(result);
    }

    @Test
    void getDefaultBoard_WhenUserHasDefault_ReturnsBoardId() {
        // Given
        setupAuthentication(USER_ID);

        Board defaultBoard = Board.builder().build();
        defaultBoard.setId(BOARD_ID);

        User user = new User();
        user.setId(USER_ID);
        user.setDefaultBoard(defaultBoard);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        // When
        UUID result = userService.getDefaultBoard();

        // Then
        assertEquals(BOARD_ID, result);
    }

    @Test
    void getDefaultBoard_WhenUserHasNoDefault_ReturnsNull() {
        // Given
        setupAuthentication(USER_ID);

        User user = new User();
        user.setId(USER_ID);
        user.setDefaultBoard(null);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        // When
        UUID result = userService.getDefaultBoard();

        // Then
        assertNull(result);
    }

    @Test
    void getDefaultBoard_WhenUserNotFound_ThrowsResourceNotFoundException() {
        // Given
        setupAuthentication(USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> userService.getDefaultBoard());
    }

    @Test
    void setDefaultBoard_WhenBoardExists_SetsDefault() {
        // Given
        setupAuthentication(USER_ID);

        User user = new User();
        user.setId(USER_ID);

        Board board = Board.builder().build();
        board.setId(BOARD_ID);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

        // When
        userService.setDefaultBoard(BOARD_ID);

        // Then
        assertEquals(board, user.getDefaultBoard());
        verify(userRepository).save(user);
    }

    @Test
    void setDefaultBoard_WhenUserNotFound_ThrowsResourceNotFoundException() {
        // Given
        setupAuthentication(USER_ID);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> userService.setDefaultBoard(BOARD_ID));
        verify(boardRepository, never()).findById(any());
    }

    @Test
    void setDefaultBoard_WhenBoardNotFound_ThrowsResourceNotFoundException() {
        // Given
        setupAuthentication(USER_ID);

        User user = new User();
        user.setId(USER_ID);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> userService.setDefaultBoard(BOARD_ID));
        verify(userRepository, never()).save(any());
    }
}
