package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.board.dto.BoardDto;
import com.kylerriggs.kanban.board.dto.BoardRequest;
import com.kylerriggs.kanban.board.dto.BoardSummary;
import com.kylerriggs.kanban.board.dto.CollaboratorRequest;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardLimitExceededException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {
    private final BoardRepository boardRepository;
    private final BoardUserRepository boardUserRepository;
    private final UserRepository userRepository;
    private final BoardMapper boardMapper;
    private final UserService userService;
    private final BoardProperties boardProperties;
    private final TaskMapper taskMapper;
    private final TaskRepository taskRepository;
    private final BoardEventPublisher eventPublisher;

    /**
     * Creates a new board with default columns and assigns the creator as an admin. The board is
     * automatically set as the user's default if they don't have one.
     *
     * @param boardRequest containing name and description of the board to create
     * @return the created board as a DTO
     * @throws BoardLimitExceededException if the user has reached the maximum board limit
     * @throws ResourceNotFoundException if the user doesn't exist
     */
    @Transactional
    public BoardDto createBoard(BoardRequest boardRequest) {
        String requestUserId = userService.getCurrentUserId();

        if (requestUserId == null) {
            throw new UnauthorizedException("User not authenticated");
        }

        // Check if user has reached the board limit
        long userBoardCount = boardRepository.countByCollaboratorsUserId(requestUserId);
        if (userBoardCount >= boardProperties.getMaxBoardsPerUser()) {
            throw new BoardLimitExceededException(
                    "User has reached the maximum limit of "
                            + boardProperties.getMaxBoardsPerUser()
                            + " boards");
        }

        User owner =
                userRepository
                        .findById(requestUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "User not found: " + requestUserId));

        Board board =
                Board.builder()
                        .name(boardRequest.name())
                        .description(boardRequest.description())
                        .createdBy(owner)
                        .build();

        final List<String> DEFAULT_COLUMNS = boardProperties.getDefaultColumns();

        for (String columnName : DEFAULT_COLUMNS) {
            Column column =
                    Column.builder()
                            .name(columnName)
                            .position(DEFAULT_COLUMNS.indexOf(columnName))
                            .board(board)
                            .build();
            board.getColumns().add(column);
        }

        BoardUser ownerMembership =
                BoardUser.builder().board(board).user(owner).role(BoardRole.ADMIN).build();

        board.getCollaborators().add(ownerMembership);
        Board savedBoard = boardRepository.save(board);

        boolean isDefault = false;
        if (owner.getDefaultBoard() == null) {
            owner.setDefaultBoard(savedBoard);
            isDefault = true;
        }

        return boardMapper.toDto(savedBoard, isDefault);
    }

    /**
     * Retrieves a board by its ID with all details including collaborators, tasks, and columns.
     *
     * @param boardId the ID of the board to retrieve
     * @return the board as a DTO with isDefault flag
     * @throws ResourceNotFoundException if the board doesn't exist
     */
    public BoardDto getBoard(@NonNull UUID boardId) {
        Board board =
                boardRepository
                        .findByIdWithDetails(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        String requestUserId = userService.getCurrentUserId();
        UUID defaultBoardId = userRepository.findDefaultBoardIdById(requestUserId).orElse(null);
        boolean isDefault = Objects.equals(board.getId(), defaultBoardId);

        return boardMapper.toDto(board, isDefault);
    }

    /**
     * Retrieves all tasks associated with a specific board.
     *
     * @param boardId the ID of the board
     * @return list of task summaries
     * @throws ResourceNotFoundException if the board doesn't exist
     */
    public List<TaskSummaryDto> getTasksForBoard(@NonNull UUID boardId) {
        return taskRepository.findByBoardId(boardId).stream()
                .map(taskMapper::toSummaryDto)
                .toList();
    }

    /**
     * Retrieves all boards that the current user is a collaborator on. Returns summary information
     * including task counts and default board status.
     *
     * @return list of board summaries for the current user
     */
    public List<BoardSummary> getBoardsForUser() {
        String requestUserId = userService.getCurrentUserId();
        UUID defaultBoardId = userService.getCurrentUserDefaultBoardId();

        List<Board> boards =
                boardRepository.findAllByCollaboratorsUserIdWithTasksAndColumn(requestUserId);

        return boards.stream()
                .map(p -> boardMapper.toSummaryDto(p, Objects.equals(p.getId(), defaultBoardId)))
                .toList();
    }

    /**
     * Updates the name and description of an existing board.
     *
     * @param boardId the ID of the board to update
     * @param boardRequest containing new name and description of the board to update
     * @return the updated board as a DTO
     * @throws ResourceNotFoundException if the board doesn't exist
     */
    @Transactional
    public BoardDto updateBoard(@NonNull UUID boardId, BoardRequest boardRequest) {
        Board boardToUpdate =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        boardToUpdate.setName(boardRequest.name());
        boardToUpdate.setDescription(boardRequest.description());

        boardRepository.save(boardToUpdate);

        // Publish event to be broadcast after transaction commits
        eventPublisher.publish("BOARD_UPDATED", boardId, boardId);

        UUID requestUserDefaultBoard = userService.getCurrentUserDefaultBoardId();
        boolean isDefault = Objects.equals(boardToUpdate.getId(), requestUserDefaultBoard);

        return boardMapper.toDto(boardToUpdate, isDefault);
    }

    // /**
    // * Deletes a board and all its associated data (tasks, columns,
    // collaborators).
    // * Disabled for now. Implementing soft deletes/archiving instead.
    // *
    // * @param boardId the ID of the board to delete
    // * @throws ResourceNotFoundException if the board doesn't exist
    // */
    // @Transactional
    // public void deleteBoard(UUID boardId) {
    // Board boardToDelete = boardRepository.findById(boardId)
    // .orElseThrow(() -> new ResourceNotFoundException("Board not found: " +
    // boardId));
    // boardRepository.delete(boardToDelete);
    // }

    /**
     * Adds a new collaborator to a board with the specified role. If the user has no default board,
     * this board becomes their default.
     *
     * @param boardId the ID of the board
     * @param collaboratorRequest the collaborator request containing user ID and role
     * @throws BoardLimitExceededException if the user has reached the maximum board limit
     * @throws ResourceNotFoundException if the board or user doesn't exist
     * @throws BadRequestException if the user is already a collaborator
     */
    @Transactional
    public void addCollaborator(@NonNull UUID boardId, CollaboratorRequest collaboratorRequest) {
        String userId = collaboratorRequest.userId();
        BoardRole role = collaboratorRequest.role();

        // Check if user has reached the board limit
        long userBoardCount = boardRepository.countByCollaboratorsUserId(userId);
        if (userBoardCount >= boardProperties.getMaxBoardsPerUser()) {
            throw new BoardLimitExceededException(
                    "User has reached the maximum limit of "
                            + boardProperties.getMaxBoardsPerUser()
                            + " boards");
        }

        // Check membership before loading the board to avoid N+1 query
        if (boardUserRepository.existsByBoardIdAndUserId(boardId, userId)) {
            throw new BadRequestException("User is already a collaborator in this board.");
        }

        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        User userToAdd =
                userRepository
                        .findById(userId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("User not found: " + userId));

        BoardUser newCollaborator =
                BoardUser.builder().board(board).user(userToAdd).role(role).build();

        board.getCollaborators().add(newCollaborator);

        if (userToAdd.getDefaultBoard() == null) {
            userToAdd.setDefaultBoard(board);
        }

        boardRepository.save(board);
    }

    /**
     * Removes a collaborator from a board. Prevents removal if they are the only collaborator or
     * last admin. Unassigns the user from all tasks and clears their default board if needed.
     *
     * @param boardId the ID of the board
     * @param userId the ID of the user to remove
     * @throws ResourceNotFoundException if the board or collaborator doesn't exist
     * @throws BadRequestException if removing would leave no collaborators or admins
     */
    @Transactional
    public void removeCollaborator(@NonNull UUID boardId, @NonNull String userId) {
        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        BoardUser collaboratorToRemove =
                board.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(userId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Collaborator not found with ID: " + userId));

        if (board.getCollaborators().size() == 1) {
            throw new BadRequestException(
                    "Cannot remove the only collaborator. Please delete the board instead.");
        }

        long adminCount =
                board.getCollaborators().stream()
                        .filter(c -> c.getRole() == BoardRole.ADMIN)
                        .count();

        if (adminCount == 1 && collaboratorToRemove.getRole() == BoardRole.ADMIN) {
            throw new BadRequestException("Cannot remove the last admin from the board.");
        }

        board.getTasks()
                .forEach(
                        task -> {
                            if (task.getAssignedTo() != null
                                    && task.getAssignedTo().getId().equals(userId)) {
                                task.setAssignedTo(null);
                            }
                        });

        User user = collaboratorToRemove.getUser();
        if (user.getDefaultBoard() != null && user.getDefaultBoard().getId().equals(boardId)) {
            user.setDefaultBoard(null);
            userRepository.save(user);
        }

        board.getCollaborators().remove(collaboratorToRemove);

        // If no admins remain, promote the first found collaborator to admin
        if (board.getCollaborators().stream().noneMatch(c -> c.getRole() == BoardRole.ADMIN)) {
            board.getCollaborators().stream()
                    .findFirst()
                    .ifPresent(newAdmin -> newAdmin.setRole(BoardRole.ADMIN));
        }

        boardRepository.save(board);
    }

    /**
     * Updates the role of a collaborator on a board. Prevents demoting the last admin or changing
     * the sole collaborator's role from admin.
     *
     * @param boardId the ID of the board
     * @param userId the ID of the user whose role to update
     * @param newRole the new role to assign
     * @throws ResourceNotFoundException if the board or collaborator doesn't exist
     * @throws BadRequestException if the role change would violate business rules
     */
    @Transactional
    public void updateCollaboratorRole(
            @NonNull UUID boardId, @NonNull String userId, @NonNull BoardRole newRole) {
        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        BoardUser collaboratorToUpdate =
                board.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(userId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Collaborator not found with ID: " + userId));

        // If this user is the only collaborator, they MUST be an ADMIN.
        if (board.getCollaborators().size() == 1) {
            if (newRole != BoardRole.ADMIN) {
                throw new BadRequestException(
                        "Cannot change the role of the only collaborator. They must remain an"
                                + " ADMIN.");
            }
            return;
        }

        // Check if the user is the last admin, and prevent demotion if so
        long adminCount =
                board.getCollaborators().stream()
                        .filter(c -> c.getRole() == BoardRole.ADMIN)
                        .count();

        if (adminCount == 1
                && collaboratorToUpdate.getRole() == BoardRole.ADMIN
                && newRole != BoardRole.ADMIN) {
            throw new BadRequestException(
                    "Cannot demote the last admin of the board. Please assign another admin"
                            + " first.");
        }

        collaboratorToUpdate.setRole(newRole);

        boardRepository.save(board);
    }
}
