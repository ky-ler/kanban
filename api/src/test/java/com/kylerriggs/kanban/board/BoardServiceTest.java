package com.kylerriggs.kanban.board;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kylerriggs.kanban.board.dto.BoardArchiveRequest;
import com.kylerriggs.kanban.board.dto.BoardDto;
import com.kylerriggs.kanban.board.dto.BoardRequest;
import com.kylerriggs.kanban.board.dto.BoardSummary;
import com.kylerriggs.kanban.board.dto.CollaboratorDto;
import com.kylerriggs.kanban.board.dto.CollaboratorRequest;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardLimitExceededException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskArchiveService;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserLookupService;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;
import com.kylerriggs.kanban.websocket.dto.BoardEventType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    private static final String USER_ID = "auth0|user123";
    private static final String OTHER_USER_ID = "auth0|other456";
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");

    @Mock private BoardRepository boardRepository;
    @Mock private BoardUserRepository boardUserRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private BoardMapper boardMapper;
    @Mock private TaskMapper taskMapper;
    @Mock private UserService userService;
    @Mock private UserLookupService userLookupService;
    @Mock private BoardLimitPolicy boardLimitPolicy;
    @Mock private BoardProperties boardProperties;
    @Mock private TaskArchiveService taskArchiveService;
    @Mock private com.kylerriggs.kanban.comment.CommentRepository commentRepository;
    @Mock private com.kylerriggs.kanban.checklist.ChecklistItemRepository checklistItemRepository;
    @Mock private BoardEventPublisher eventPublisher;
    @InjectMocks private BoardService boardService;

    private User user;
    private User otherUser;
    private Board board;
    private BoardDto boardDto;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(USER_ID);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setProfileImageUrl("https://example.com/image.png");

        otherUser = new User();
        otherUser.setId(OTHER_USER_ID);
        otherUser.setUsername("otheruser");
        otherUser.setEmail("other@example.com");
        otherUser.setProfileImageUrl("https://example.com/other.png");

        board =
                Board.builder()
                        .id(BOARD_ID)
                        .name("Test Board")
                        .description("Test Description")
                        .createdBy(user)
                        .tasks(new HashSet<>())
                        .collaborators(new HashSet<>())
                        .columns(new HashSet<>())
                        .build();
        board.setDateCreated(Instant.now());
        board.setDateModified(Instant.now());

        BoardUser boardUser =
                BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
        board.getCollaborators().add(boardUser);

        UserSummaryDto userSummary =
                new UserSummaryDto(USER_ID, "testuser", "https://example.com/image.png");
        boardDto =
                new BoardDto(
                        BOARD_ID,
                        "Test Board",
                        "Test Description",
                        userSummary,
                        new CollaboratorDto[] {},
                        new TaskSummaryDto[] {},
                        new ColumnDto[] {},
                        false,
                        Instant.now().toString(),
                        Instant.now().toString(),
                        false);
    }

    @Nested
    class CreateBoardTests {
        private BoardRequest boardRequest;

        @BeforeEach
        void setUp() {
            boardRequest = new BoardRequest("New Board", "New Description", false);
        }

        @Test
        void createBoard_WhenValid_ReturnsBoardDto() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userLookupService.getRequiredUser(USER_ID)).thenReturn(user);
            when(boardProperties.getDefaultColumns())
                    .thenReturn(List.of("Backlog", "To Do", "In Progress", "Done"));
            when(boardRepository.save(any(Board.class)))
                    .thenAnswer(
                            inv -> {
                                Board savedBoard = inv.getArgument(0, Board.class);
                                savedBoard.setId(BOARD_ID);
                                savedBoard.setDateCreated(Instant.now());
                                savedBoard.setDateModified(Instant.now());
                                return savedBoard;
                            });
            when(boardMapper.toDto(any(Board.class), eq(USER_ID), anyMap())).thenReturn(boardDto);

            // When
            BoardDto result = boardService.createBoard(boardRequest);

            // Then
            assertNotNull(result);
            verify(boardRepository).save(any(Board.class));

            // Verify default columns are created
            ArgumentCaptor<Board> boardCaptor = ArgumentCaptor.forClass(Board.class);
            verify(boardRepository).save(boardCaptor.capture());
            Board savedBoard = boardCaptor.getValue();
            assertEquals(4, savedBoard.getColumns().size());
            assertEquals(1, savedBoard.getCollaborators().size());
        }

        @Test
        void createBoard_WhenBoardLimitExceeded_ThrowsBoardLimitExceededException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            doThrow(new BoardLimitExceededException("limit"))
                    .when(boardLimitPolicy)
                    .assertCanCreateOrCollaborate(USER_ID);

            // When & Then
            assertThrows(
                    BoardLimitExceededException.class,
                    () -> boardService.createBoard(boardRequest));
            verify(boardRepository, never()).save(any());
        }

        @Test
        void createBoard_WhenUserNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userLookupService.getRequiredUser(USER_ID))
                    .thenThrow(new ResourceNotFoundException("User not found: " + USER_ID));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class, () -> boardService.createBoard(boardRequest));
        }

        @Test
        void createBoard_WhenUserNotAuthenticated_ThrowsUnauthorizedException() {
            // Given
            when(userService.getCurrentUserId())
                    .thenThrow(new UnauthorizedException("User not authenticated"));

            // When & Then
            assertThrows(UnauthorizedException.class, () -> boardService.createBoard(boardRequest));
        }
    }

    @Nested
    class GetBoardTests {
        @Test
        void getBoard_WhenBoardExists_ReturnsBoardDto() {
            // Given
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap(), anyMap()))
                    .thenReturn(boardDto);

            // When
            BoardDto result = boardService.getBoard(Objects.requireNonNull(BOARD_ID));

            // Then
            assertNotNull(result);
            verify(boardMapper).toDto(eq(board), eq(USER_ID), anyMap(), anyMap());
        }

        @Test
        void getBoard_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> boardService.getBoard(Objects.requireNonNull(BOARD_ID)));
        }
    }

    @Nested
    class GetBoardsForUserTests {
        @Test
        void getBoardsForUser_ReturnsActiveBoards() {
            // Given
            BoardSummary summary =
                    new BoardSummary(
                            BOARD_ID,
                            "Test Board",
                            "Description",
                            Instant.now().toString(),
                            0,
                            0,
                            false,
                            true);

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findAllActiveByCollaboratorsUserId(USER_ID))
                    .thenReturn(List.of(board));
            when(boardMapper.toSummaryDto(board, USER_ID)).thenReturn(summary);

            // When
            List<BoardSummary> result = boardService.getBoardsForUser();

            // Then
            assertEquals(1, result.size());
            assertEquals(BOARD_ID, result.get(0).id());
            verify(boardRepository).findAllActiveByCollaboratorsUserId(USER_ID);
        }
    }

    @Nested
    class GetArchivedBoardsForUserTests {
        @Test
        void getArchivedBoardsForUser_ReturnsArchivedBoardsCreatedByUser() {
            // Given
            Board archivedBoard =
                    Board.builder()
                            .id(UUID.randomUUID())
                            .name("Archived Board")
                            .description("Archived")
                            .createdBy(user)
                            .isArchived(true)
                            .tasks(new HashSet<>())
                            .collaborators(new HashSet<>())
                            .columns(new HashSet<>())
                            .build();
            archivedBoard.setDateCreated(Instant.now());
            archivedBoard.setDateModified(Instant.now());

            BoardSummary summary =
                    new BoardSummary(
                            archivedBoard.getId(),
                            "Archived Board",
                            "Archived",
                            Instant.now().toString(),
                            0,
                            0,
                            true,
                            false);

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findArchivedByCreatorId(USER_ID))
                    .thenReturn(List.of(archivedBoard));
            when(boardMapper.toSummaryDto(archivedBoard, USER_ID)).thenReturn(summary);

            // When
            List<BoardSummary> result = boardService.getArchivedBoardsForUser();

            // Then
            assertEquals(1, result.size());
            assertTrue(result.get(0).isArchived());
            verify(boardRepository).findArchivedByCreatorId(USER_ID);
        }
    }

    @Nested
    class UpdateBoardTests {
        private BoardRequest updateRequest;

        @BeforeEach
        void setUp() {
            updateRequest = new BoardRequest("Updated Board", "Updated Description", false);
        }

        @Test
        void updateBoard_WhenBoardExists_UpdatesAndReturnsBoardDto() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap(), anyMap()))
                    .thenReturn(boardDto);

            // When
            boardService.updateBoard(Objects.requireNonNull(BOARD_ID), updateRequest);
            // Then
            assertEquals("Updated Board", board.getName());
            assertEquals("Updated Description", board.getDescription());
            verify(boardRepository).save(Objects.requireNonNull(board));
            verify(eventPublisher).publish(any(BoardEventType.class), eq(BOARD_ID), any());
        }

        @Test
        void updateBoard_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.updateBoard(
                                    Objects.requireNonNull(BOARD_ID), updateRequest));
        }
    }

    @Nested
    class UpdateBoardArchiveTests {
        @Test
        void updateBoardArchive_WhenUnarchivedTasksExistAndNotConfirmed_ThrowsBadRequest() {
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(taskRepository.countByBoardIdAndIsArchivedFalse(BOARD_ID)).thenReturn(2L);

            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.updateBoardArchive(
                                    BOARD_ID, new BoardArchiveRequest(true, false)));
        }

        @Test
        void updateBoardArchive_WhenConfirmed_ArchivesBoardAndTasks() {
            Task activeTask = Task.builder().id(UUID.randomUUID()).board(board).build();
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(taskRepository.countByBoardIdAndIsArchivedFalse(BOARD_ID)).thenReturn(3L);
            when(taskRepository.findByBoardId(BOARD_ID)).thenReturn(List.of(activeTask));
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap(), anyMap()))
                    .thenReturn(boardDto);

            BoardDto result =
                    boardService.updateBoardArchive(BOARD_ID, new BoardArchiveRequest(true, true));

            assertNotNull(result);
            assertTrue(board.isArchived());
            verify(taskArchiveService).archiveTasks(List.of(activeTask));
            verify(eventPublisher).publish(BoardEventType.BOARD_UPDATED, BOARD_ID, BOARD_ID);
        }

        @Test
        void updateBoardArchive_WhenUnarchiving_UnarchivesTasksInActiveColumns() {
            board.setArchived(true);
            Column activeColumn =
                    Column.builder().id(UUID.randomUUID()).name("Todo").board(board).build();
            Task archivedTask =
                    Task.builder()
                            .id(UUID.randomUUID())
                            .board(board)
                            .column(activeColumn)
                            .isArchived(true)
                            .build();

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(taskRepository.findByBoardId(BOARD_ID)).thenReturn(List.of(archivedTask));
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap(), anyMap()))
                    .thenReturn(boardDto);

            boardService.updateBoardArchive(BOARD_ID, new BoardArchiveRequest(false, false));

            assertFalse(board.isArchived());
            verify(taskArchiveService, never()).archiveTasks(anyCollection());
            verify(taskArchiveService).restoreTask(archivedTask);
        }

        @Test
        void updateBoardArchive_WhenUnarchivingAndBoardLimitExceeded_ThrowsException() {
            board.setArchived(true);
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            doThrow(new BoardLimitExceededException("limit"))
                    .when(boardLimitPolicy)
                    .assertCanCreateOrCollaborate(USER_ID);

            assertThrows(
                    BoardLimitExceededException.class,
                    () ->
                            boardService.updateBoardArchive(
                                    BOARD_ID, new BoardArchiveRequest(false, false)));
            assertTrue(board.isArchived()); // Board should remain archived
        }
    }

    @Nested
    class AddCollaboratorTests {
        private CollaboratorRequest collaboratorRequest;

        @BeforeEach
        void setUp() {
            collaboratorRequest = new CollaboratorRequest(OTHER_USER_ID, BoardRole.MEMBER);
        }

        @Test
        void addCollaborator_WhenValid_AddsCollaborator() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.existsByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), OTHER_USER_ID))
                    .thenReturn(false);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(userLookupService.getRequiredUser(OTHER_USER_ID)).thenReturn(otherUser);

            // When
            boardService.addCollaborator(Objects.requireNonNull(BOARD_ID), collaboratorRequest);
            // Then
            assertEquals(2, board.getCollaborators().size());
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void addCollaborator_WhenAlreadyCollaborator_ThrowsBadRequestException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.existsByBoardIdAndUserId(BOARD_ID, OTHER_USER_ID))
                    .thenReturn(true);

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.addCollaborator(
                                    Objects.requireNonNull(BOARD_ID), collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenUserBoardLimitExceeded_ThrowsBoardLimitExceededException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            doThrow(new BoardLimitExceededException("limit"))
                    .when(boardLimitPolicy)
                    .assertCanCreateOrCollaborate(OTHER_USER_ID);

            // When & Then
            assertThrows(
                    BoardLimitExceededException.class,
                    () ->
                            boardService.addCollaborator(
                                    Objects.requireNonNull(BOARD_ID), collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.existsByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), OTHER_USER_ID))
                    .thenReturn(false);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.addCollaborator(
                                    Objects.requireNonNull(BOARD_ID), collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenUserNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.existsByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), OTHER_USER_ID))
                    .thenReturn(false);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(userLookupService.getRequiredUser(OTHER_USER_ID))
                    .thenThrow(new ResourceNotFoundException("User not found: " + OTHER_USER_ID));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.addCollaborator(
                                    Objects.requireNonNull(BOARD_ID), collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenAdminAddsAdmin_ThrowsBadRequestException() {
            // Given
            User adminUser = new User();
            adminUser.setId("auth0|admin789");
            adminUser.setUsername("admin-user");
            adminUser.setEmail("admin@example.com");
            board.setCreatedBy(otherUser);
            BoardUser adminMembership =
                    BoardUser.builder().board(board).user(adminUser).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(adminMembership);

            CollaboratorRequest addAdminRequest =
                    new CollaboratorRequest("auth0|new-admin", BoardRole.ADMIN);

            when(userService.getCurrentUserId()).thenReturn(adminUser.getId());
            when(boardUserRepository.existsByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), "auth0|new-admin"))
                    .thenReturn(false);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.addCollaborator(
                                    Objects.requireNonNull(BOARD_ID), addAdminRequest));
        }
    }

    @Nested
    class RemoveCollaboratorTests {
        private BoardUser otherBoardUser;

        @BeforeEach
        void setUp() {
            otherBoardUser =
                    BoardUser.builder().board(board).user(otherUser).role(BoardRole.MEMBER).build();
            board.getCollaborators().add(otherBoardUser);
        }

        @Test
        void removeCollaborator_WhenValid_RemovesCollaborator() {
            // Given
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When
            boardService.removeCollaborator(Objects.requireNonNull(BOARD_ID), OTHER_USER_ID);

            // Then
            assertEquals(1, board.getCollaborators().size());
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void removeCollaborator_WhenTargetIsOwner_ThrowsBadRequestException() {
            // Given
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.removeCollaborator(
                                    Objects.requireNonNull(BOARD_ID), USER_ID));
        }

        @Test
        void removeCollaborator_WhenOnlyCollaborator_ThrowsBadRequestException() {
            // Given
            board.getCollaborators().clear();
            BoardUser soleCollaborator =
                    BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(soleCollaborator);

            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.removeCollaborator(
                                    Objects.requireNonNull(BOARD_ID), USER_ID));
        }

        @Test
        void removeCollaborator_WhenLastAdmin_ThrowsBadRequestException() {
            // Given - user is only admin, otherUser is member
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.removeCollaborator(
                                    Objects.requireNonNull(BOARD_ID), USER_ID));
        }

        @Test
        void removeCollaborator_WhenUserHasTasksAssigned_UnassignsTasks() {
            // Given
            Task task =
                    Task.builder()
                            .id(UUID.randomUUID())
                            .title("Test Task")
                            .board(board)
                            .createdBy(user)
                            .assignedTo(otherUser)
                            .position(0L)
                            .build();
            board.getTasks().add(task);

            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When
            boardService.removeCollaborator(Objects.requireNonNull(BOARD_ID), OTHER_USER_ID);

            // Then
            assertNull(task.getAssignedTo());
        }

        @Test
        void removeCollaborator_WhenNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.removeCollaborator(
                                    Objects.requireNonNull(BOARD_ID), "nonexistentUser"));
        }
    }

    @Nested
    class UpdateCollaboratorRoleTests {
        private BoardUser otherBoardUser;

        @BeforeEach
        void setUp() {
            otherBoardUser =
                    BoardUser.builder().board(board).user(otherUser).role(BoardRole.MEMBER).build();
            board.getCollaborators().add(otherBoardUser);
        }

        @Test
        void updateCollaboratorRole_WhenValid_UpdatesRole() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When
            boardService.updateCollaboratorRole(
                    Objects.requireNonNull(BOARD_ID), OTHER_USER_ID, BoardRole.ADMIN);

            // Then
            assertEquals(BoardRole.ADMIN, otherBoardUser.getRole());
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void updateCollaboratorRole_WhenDemotingLastAdmin_ThrowsBadRequestException() {
            // Given - user is the only admin
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.updateCollaboratorRole(
                                    Objects.requireNonNull(BOARD_ID), USER_ID, BoardRole.MEMBER));
        }

        @Test
        void updateCollaboratorRole_WhenOnlyCollaborator_MustRemainAdmin() {
            // Given
            board.getCollaborators().clear();
            BoardUser soleCollaborator =
                    BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(soleCollaborator);

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.updateCollaboratorRole(
                                    Objects.requireNonNull(BOARD_ID), USER_ID, BoardRole.MEMBER));
        }

        @Test
        void updateCollaboratorRole_WhenOnlyCollaboratorSameRole_NoChange() {
            // Given
            board.getCollaborators().clear();
            BoardUser soleCollaborator =
                    BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(soleCollaborator);

            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When
            boardService.updateCollaboratorRole(
                    Objects.requireNonNull(BOARD_ID), USER_ID, BoardRole.ADMIN);

            // Then - no exception, role unchanged
            assertEquals(BoardRole.ADMIN, soleCollaborator.getRole());
        }

        @Test
        void updateCollaboratorRole_WhenCollaboratorNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.updateCollaboratorRole(
                                    Objects.requireNonNull(BOARD_ID),
                                    "nonexistentUser",
                                    BoardRole.ADMIN));
        }

        @Test
        void updateCollaboratorRole_WhenAdminTriesToSetAdmin_ThrowsBadRequestException() {
            // Given
            User anotherAdminUser = new User();
            anotherAdminUser.setId("auth0|admin789");
            anotherAdminUser.setUsername("admin-user");
            anotherAdminUser.setEmail("admin@example.com");

            BoardUser anotherAdminMembership =
                    BoardUser.builder()
                            .board(board)
                            .user(anotherAdminUser)
                            .role(BoardRole.ADMIN)
                            .build();
            board.getCollaborators().add(anotherAdminMembership);

            when(userService.getCurrentUserId()).thenReturn(anotherAdminUser.getId());
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.updateCollaboratorRole(
                                    Objects.requireNonNull(BOARD_ID),
                                    OTHER_USER_ID,
                                    BoardRole.ADMIN));
        }

        @Test
        void
                updateCollaboratorRole_WhenTargetIsOwnerAndNewRoleNotAdmin_ThrowsBadRequestException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.updateCollaboratorRole(
                                    Objects.requireNonNull(BOARD_ID), USER_ID, BoardRole.MEMBER));
        }
    }

    @Nested
    class TransferOwnershipTests {
        private BoardUser otherBoardUser;

        @BeforeEach
        void setUp() {
            otherBoardUser =
                    BoardUser.builder().board(board).user(otherUser).role(BoardRole.MEMBER).build();
            board.getCollaborators().add(otherBoardUser);
        }

        @Test
        void transferOwnership_WhenValid_TransfersOwnerAndDemotesPreviousOwner() {
            // Given
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When
            boardService.transferOwnership(Objects.requireNonNull(BOARD_ID), OTHER_USER_ID);

            // Then
            assertEquals(OTHER_USER_ID, board.getCreatedBy().getId());
            assertEquals(BoardRole.ADMIN, otherBoardUser.getRole());
            BoardUser previousOwnerMembership =
                    board.getCollaborators().stream()
                            .filter(c -> c.getUser().getId().equals(USER_ID))
                            .findFirst()
                            .orElseThrow();
            assertEquals(BoardRole.ADMIN, previousOwnerMembership.getRole());
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void transferOwnership_WhenTargetAlreadyOwner_ThrowsBadRequestException() {
            // Given
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () ->
                            boardService.transferOwnership(
                                    Objects.requireNonNull(BOARD_ID), USER_ID));
        }

        @Test
        void transferOwnership_WhenTargetNotCollaborator_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.transferOwnership(
                                    Objects.requireNonNull(BOARD_ID), "auth0|noncollab"));
        }
    }

    @Nested
    class ToggleFavoriteTests {
        @Test
        void toggleFavorite_WhenNotFavorite_SetsToTrue() {
            // Given
            BoardUser boardUser =
                    BoardUser.builder()
                            .board(board)
                            .user(user)
                            .role(BoardRole.ADMIN)
                            .isFavorite(false)
                            .build();
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.findByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), USER_ID))
                    .thenReturn(Optional.of(boardUser));
            when(boardUserRepository.save(any(BoardUser.class))).thenReturn(boardUser);

            // When
            boolean result = boardService.toggleFavorite(Objects.requireNonNull(BOARD_ID));

            // Then
            assertTrue(result);
            assertTrue(boardUser.isFavorite());
            verify(boardUserRepository).save(boardUser);
        }

        @Test
        void toggleFavorite_WhenFavorite_SetsToFalse() {
            // Given
            BoardUser boardUser =
                    BoardUser.builder()
                            .board(board)
                            .user(user)
                            .role(BoardRole.ADMIN)
                            .isFavorite(true)
                            .build();
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.findByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), USER_ID))
                    .thenReturn(Optional.of(boardUser));
            when(boardUserRepository.save(any(BoardUser.class))).thenReturn(boardUser);

            // When
            boolean result = boardService.toggleFavorite(Objects.requireNonNull(BOARD_ID));

            // Then
            assertFalse(result);
            assertFalse(boardUser.isFavorite());
            verify(boardUserRepository).save(boardUser);
        }

        @Test
        void toggleFavorite_WhenNotCollaborator_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardUserRepository.findByBoardIdAndUserId(BOARD_ID, USER_ID))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> boardService.toggleFavorite(Objects.requireNonNull(BOARD_ID)));
        }
    }
}
