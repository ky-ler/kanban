package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.board.dto.BoardArchiveRequest;
import com.kylerriggs.kanban.board.dto.BoardDto;
import com.kylerriggs.kanban.board.dto.BoardRequest;
import com.kylerriggs.kanban.board.dto.BoardSummary;
import com.kylerriggs.kanban.board.dto.CollaboratorRequest;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.comment.CommentRepository;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardLimitExceededException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskArchiveService;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserLookupService;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;
import com.kylerriggs.kanban.websocket.dto.BoardEventType;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {
    private final BoardRepository boardRepository;
    private final BoardUserRepository boardUserRepository;
    private final BoardMapper boardMapper;
    private final UserService userService;
    private final UserLookupService userLookupService;
    private final BoardLimitPolicy boardLimitPolicy;
    private final BoardProperties boardProperties;
    private final TaskMapper taskMapper;
    private final TaskRepository taskRepository;
    private final TaskArchiveService taskArchiveService;
    private final CommentRepository commentRepository;
    private final BoardEventPublisher eventPublisher;

    /**
     * Creates a new board with default columns and assigns the creator as an admin.
     *
     * @param boardRequest containing name and description of the board to create
     * @return the created board as a DTO
     * @throws BoardLimitExceededException if the user has reached the maximum board limit
     * @throws ResourceNotFoundException if the user doesn't exist
     */
    @Transactional
    public BoardDto createBoard(BoardRequest boardRequest) {
        String requestUserId = userService.getCurrentUserId();

        boardLimitPolicy.assertCanCreateOrCollaborate(requestUserId);

        User owner = userLookupService.getRequiredUser(requestUserId);

        Board board =
                Board.builder()
                        .name(boardRequest.name())
                        .description(boardRequest.description())
                        .isArchived(boardRequest.isArchived())
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

        return boardMapper.toDto(savedBoard, requestUserId, Map.of());
    }

    /**
     * Retrieves a board by its ID with all details including collaborators, tasks, and columns.
     *
     * @param boardId the ID of the board to retrieve
     * @return the board as a DTO with isFavorite flag
     * @throws ResourceNotFoundException if the board doesn't exist
     */
    public BoardDto getBoard(@NonNull UUID boardId) {
        Board board =
                boardRepository
                        .findByIdWithDetails(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        String requestUserId = userService.getCurrentUserId();

        List<UUID> taskIds = board.getTasks().stream().map(task -> task.getId()).toList();
        Map<UUID, Long> commentCountByTaskId = getCommentCountByTaskIds(taskIds);

        return boardMapper.toDto(board, requestUserId, commentCountByTaskId);
    }

    /**
     * Retrieves all tasks associated with a specific board.
     *
     * @param boardId the ID of the board
     * @return list of task summaries
     * @throws ResourceNotFoundException if the board doesn't exist
     */
    public List<TaskSummaryDto> getTasksForBoard(@NonNull UUID boardId) {
        List<Task> tasks = taskRepository.findByBoardId(boardId);
        List<UUID> taskIds = tasks.stream().map(task -> task.getId()).toList();
        Map<UUID, Long> commentCountByTaskId = getCommentCountByTaskIds(taskIds);

        return tasks.stream()
                .map(
                        task ->
                                taskMapper.toSummaryDto(
                                        task, commentCountByTaskId.getOrDefault(task.getId(), 0L)))
                .toList();
    }

    /**
     * Retrieves all boards that the current user is a collaborator on. Returns summary information
     * including task counts and favorite status.
     *
     * @return list of board summaries for the current user
     */
    public List<BoardSummary> getBoardsForUser() {
        String requestUserId = userService.getCurrentUserId();

        List<Board> boards = boardRepository.findAllActiveByCollaboratorsUserId(requestUserId);

        return boards.stream().map(p -> boardMapper.toSummaryDto(p, requestUserId)).toList();
    }

    /**
     * Retrieves all archived boards that the current user created. Only the board creator can view
     * their archived boards.
     *
     * @return list of archived board summaries for the current user
     */
    public List<BoardSummary> getArchivedBoardsForUser() {
        String requestUserId = userService.getCurrentUserId();

        List<Board> boards = boardRepository.findArchivedByCreatorId(requestUserId);

        return boards.stream().map(p -> boardMapper.toSummaryDto(p, requestUserId)).toList();
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
        String requestUserId = userService.getCurrentUserId();

        Board boardToUpdate =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        if (boardToUpdate.isArchived() != boardRequest.isArchived()) {
            throw new BadRequestException(
                    "Use the archive endpoint to change board archive state.");
        }

        boardToUpdate.setName(boardRequest.name());
        boardToUpdate.setDescription(boardRequest.description());
        boardToUpdate.setArchived(boardRequest.isArchived());

        boardRepository.save(boardToUpdate);

        // Publish event to be broadcast after transaction commits
        eventPublisher.publish(BoardEventType.BOARD_UPDATED, boardId, boardId);

        List<UUID> taskIds = boardToUpdate.getTasks().stream().map(task -> task.getId()).toList();
        Map<UUID, Long> commentCountByTaskId = getCommentCountByTaskIds(taskIds);

        return boardMapper.toDto(boardToUpdate, requestUserId, commentCountByTaskId);
    }

    @Transactional
    public BoardDto updateBoardArchive(@NonNull UUID boardId, BoardArchiveRequest request) {
        String requestUserId = userService.getCurrentUserId();

        Board boardToUpdate =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        boolean shouldArchive = request.isArchived();
        boolean isUnarchiving = !shouldArchive && boardToUpdate.isArchived();

        // When unarchiving, check the board limit for the requesting user
        if (isUnarchiving) {
            boardLimitPolicy.assertCanCreateOrCollaborate(requestUserId);
        }

        if (boardToUpdate.isArchived() == shouldArchive) {
            Board currentBoard =
                    boardRepository
                            .findByIdWithDetails(boardId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "Board not found: " + boardId));
            List<UUID> taskIds = currentBoard.getTasks().stream().map(Task::getId).toList();
            Map<UUID, Long> commentCountByTaskId = getCommentCountByTaskIds(taskIds);
            return boardMapper.toDto(currentBoard, requestUserId, commentCountByTaskId);
        }

        if (shouldArchive && !boardToUpdate.isArchived()) {
            long unarchivedTaskCount = taskRepository.countByBoardIdAndIsArchivedFalse(boardId);
            if (unarchivedTaskCount > 0 && !request.confirmArchiveTasks()) {
                throw new BadRequestException(
                        "Board has unarchived tasks. Set confirmArchiveTasks=true to archive all"
                                + " tasks in this board.");
            }

            if (unarchivedTaskCount > 0) {
                taskArchiveService.archiveTasks(taskRepository.findByBoardId(boardId));
            }
        }

        boardToUpdate.setArchived(shouldArchive);
        boardRepository.save(boardToUpdate);

        if (isUnarchiving) {
            taskRepository.findByBoardId(boardId).stream()
                    .filter(Task::isArchived)
                    .filter(task -> !task.getColumn().isArchived())
                    .forEach(taskArchiveService::restoreTask);
        }

        eventPublisher.publish(BoardEventType.BOARD_UPDATED, boardId, boardId);

        Board refreshedBoard =
                boardRepository
                        .findByIdWithDetails(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        List<UUID> taskIds = refreshedBoard.getTasks().stream().map(Task::getId).toList();
        Map<UUID, Long> commentCountByTaskId = getCommentCountByTaskIds(taskIds);

        return boardMapper.toDto(refreshedBoard, requestUserId, commentCountByTaskId);
    }

    private Map<UUID, Long> getCommentCountByTaskIds(List<UUID> taskIds) {
        if (taskIds.isEmpty()) {
            return Map.of();
        }

        return commentRepository.countByTaskIds(taskIds).stream()
                .collect(
                        Collectors.toMap(
                                CommentRepository.TaskCommentCount::getTaskId,
                                CommentRepository.TaskCommentCount::getCommentCount));
    }

    @Transactional
    public void deleteBoard(@NonNull UUID boardId) {
        Board boardToDelete =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        if (!boardToDelete.isArchived()) {
            throw new BadRequestException("Board must be archived before it can be deleted.");
        }

        boardRepository.delete(boardToDelete);
    }

    /**
     * Adds a new collaborator to a board with the specified role.
     *
     * @param boardId the ID of the board
     * @param collaboratorRequest the collaborator request containing user ID and role
     * @throws BoardLimitExceededException if the user has reached the maximum board limit
     * @throws ResourceNotFoundException if the board or user doesn't exist
     * @throws BadRequestException if the user is already a collaborator
     */
    @Transactional
    public void addCollaborator(@NonNull UUID boardId, CollaboratorRequest collaboratorRequest) {
        String requestUserId = userService.getCurrentUserId();
        String userId = collaboratorRequest.userId();
        BoardRole role = collaboratorRequest.role();

        boardLimitPolicy.assertCanCreateOrCollaborate(userId);

        // Check membership before loading the board to avoid N+1 query
        if (boardUserRepository.existsByBoardIdAndUserId(boardId, userId)) {
            throw new BadRequestException("User is already a collaborator in this board.");
        }

        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        boolean requesterIsCreator = board.getCreatedBy().getId().equals(requestUserId);
        if (!requesterIsCreator && role == BoardRole.ADMIN) {
            throw new BadRequestException("Only the board owner can grant admin role.");
        }

        User userToAdd = userLookupService.getRequiredUser(userId);

        BoardUser newCollaborator =
                BoardUser.builder().board(board).user(userToAdd).role(role).build();

        board.getCollaborators().add(newCollaborator);

        boardRepository.save(board);
    }

    /**
     * Removes a collaborator from a board. Prevents removal if they are the only collaborator or
     * last admin. Unassigns the user from all tasks.
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

        if (board.getCreatedBy().getId().equals(userId)) {
            throw new BadRequestException(
                    "Cannot remove the board owner. Transfer ownership first.");
        }

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
        String requestUserId = userService.getCurrentUserId();
        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        boolean requesterIsCreator = board.getCreatedBy().getId().equals(requestUserId);

        BoardUser collaboratorToUpdate =
                board.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(userId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Collaborator not found with ID: " + userId));

        if (board.getCreatedBy().getId().equals(userId) && newRole != BoardRole.ADMIN) {
            throw new BadRequestException(
                    "Cannot change the owner's role. Transfer ownership first.");
        }

        if (!requesterIsCreator
                && (newRole == BoardRole.ADMIN
                        || collaboratorToUpdate.getRole() == BoardRole.ADMIN)) {
            throw new BadRequestException("Only the board owner can grant or revoke admin role.");
        }

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

    /**
     * Transfers ownership of a board to another collaborator. The new owner is set as board creator
     * and ensured to be an admin. The previous owner is demoted to admin.
     *
     * @param boardId the ID of the board
     * @param newOwnerUserId the ID of the collaborator to become owner
     * @throws ResourceNotFoundException if the board or target collaborator is not found
     * @throws BadRequestException if attempting to transfer to current owner
     */
    @Transactional
    public void transferOwnership(@NonNull UUID boardId, @NonNull String newOwnerUserId) {
        Board board =
                boardRepository
                        .findById(boardId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Board not found: " + boardId));

        User previousOwner = board.getCreatedBy();
        if (previousOwner.getId().equals(newOwnerUserId)) {
            throw new BadRequestException("User is already the board owner.");
        }

        BoardUser newOwnerMembership =
                board.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(newOwnerUserId))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Collaborator not found with ID: "
                                                        + newOwnerUserId));

        BoardUser previousOwnerMembership =
                board.getCollaborators().stream()
                        .filter(c -> c.getUser().getId().equals(previousOwner.getId()))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Current owner is not a collaborator on this board."));

        board.setCreatedBy(newOwnerMembership.getUser());
        newOwnerMembership.setRole(BoardRole.ADMIN);
        previousOwnerMembership.setRole(BoardRole.ADMIN);

        boardRepository.save(board);
    }

    /**
     * Toggles the favorite status of a board for the current user.
     *
     * @param boardId the ID of the board to toggle favorite status
     * @return the new favorite status (true if now a favorite, false otherwise)
     * @throws ResourceNotFoundException if the user is not a collaborator on the board
     */
    @Transactional
    public boolean toggleFavorite(@NonNull UUID boardId) {
        String requestUserId = userService.getCurrentUserId();
        BoardUser boardUser =
                boardUserRepository
                        .findByBoardIdAndUserId(boardId, requestUserId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Not a collaborator on this board"));
        boardUser.setFavorite(!boardUser.isFavorite());
        boardUserRepository.save(boardUser);
        return boardUser.isFavorite();
    }
}
