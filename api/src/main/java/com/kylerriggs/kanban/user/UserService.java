package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final BoardRepository boardRepository;

    /**
     * Retrieves the ID of the currently authenticated user from the security context.
     *
     * @return the user ID from the authentication token
     */
    public String getCurrentUserId() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();

        if (userId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        return userId;
    }

    /**
     * Retrieves the default board ID for the currently authenticated user.
     *
     * @return the ID of the user's default board, or null if no default board is set
     */
    public UUID getCurrentUserDefaultBoardId() {
        String requestUserId = getCurrentUserId();

        return userRepository.findDefaultBoardIdById(requestUserId).orElse(null);
    }

    /**
     * Retrieves the default board ID for the current user.
     *
     * @return the ID of the user's default board
     * @throws ResourceNotFoundException if the user doesn't exist
     */
    public UUID getDefaultBoard() {
        String requestUserId = getCurrentUserId();

        if (requestUserId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        User user =
                userRepository
                        .findById(requestUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "User not found: " + requestUserId));

        Board defaultBoard = user.getDefaultBoard();

        return defaultBoard != null ? defaultBoard.getId() : null;
    }

    /**
     * Sets the specified board as the default board for the current user.
     *
     * @param boardId the ID of the board to set as default
     * @throws ResourceNotFoundException if the user or board doesn't exist
     */
    public void setDefaultBoard(@NonNull UUID boardId) {
        String requestUserId = getCurrentUserId();

        if (requestUserId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        User user =
                userRepository
                        .findById(requestUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "User not found: " + requestUserId));

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found: " + boardId));

        user.setDefaultBoard(board);
    }
}
