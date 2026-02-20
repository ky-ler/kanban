package com.kylerriggs.kanban.board;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.board.dto.BoardArchiveRequest;
import com.kylerriggs.kanban.board.dto.BoardDto;
import com.kylerriggs.kanban.board.dto.BoardRequest;
import com.kylerriggs.kanban.board.dto.BoardSummary;
import com.kylerriggs.kanban.board.dto.CollaboratorDto;
import com.kylerriggs.kanban.board.dto.CollaboratorRequest;
import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardLimitExceededException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.exception.UnauthorizedException;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    private static final String USER_ID = "auth0|user123";
    private static final String OTHER_USER_ID = "auth0|other456";
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");

    @Mock private BoardRepository boardRepository;
    @Mock private BoardUserRepository boardUserRepository;
    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private BoardMapper boardMapper;
    @Mock private TaskMapper taskMapper;
    @Mock private UserService userService;
    @Mock private BoardProperties boardProperties;
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
            when(boardRepository.countByCollaboratorsUserId(USER_ID)).thenReturn(0L);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
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
            when(boardRepository.countByCollaboratorsUserId(USER_ID)).thenReturn(10L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);

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
            when(boardRepository.countByCollaboratorsUserId(USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

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
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap())).thenReturn(boardDto);

            // When
            BoardDto result = boardService.getBoard(Objects.requireNonNull(BOARD_ID));

            // Then
            assertNotNull(result);
            verify(boardMapper).toDto(eq(board), eq(USER_ID), anyMap());
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
        void getBoardsForUser_ReturnsUserBoards() {
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
            when(boardRepository.findAllByCollaboratorsUserIdWithTasksAndColumn(USER_ID))
                    .thenReturn(List.of(board));
            when(boardMapper.toSummaryDto(board, USER_ID)).thenReturn(summary);

            // When
            List<BoardSummary> result = boardService.getBoardsForUser();

            // Then
            assertEquals(1, result.size());
            assertEquals(BOARD_ID, result.get(0).id());
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
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap())).thenReturn(boardDto);

            // When
            boardService.updateBoard(Objects.requireNonNull(BOARD_ID), updateRequest);
            // Then
            assertEquals("Updated Board", board.getName());
            assertEquals("Updated Description", board.getDescription());
            verify(boardRepository).save(Objects.requireNonNull(board));
            verify(eventPublisher).publish(anyString(), eq(BOARD_ID), any());
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
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(taskRepository.countByBoardIdAndIsArchivedFalse(BOARD_ID)).thenReturn(3L);
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap())).thenReturn(boardDto);

            BoardDto result =
                    boardService.updateBoardArchive(BOARD_ID, new BoardArchiveRequest(true, true));

            assertNotNull(result);
            assertTrue(board.isArchived());
            verify(taskRepository).archiveByBoardId(eq(BOARD_ID), any());
            verify(eventPublisher).publish("BOARD_UPDATED", BOARD_ID, BOARD_ID);
        }

        @Test
        void updateBoardArchive_WhenUnarchiving_DoesNotUnarchiveTasks() {
            board.setArchived(true);
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(boardMapper.toDto(eq(board), eq(USER_ID), anyMap())).thenReturn(boardDto);

            boardService.updateBoardArchive(BOARD_ID, new BoardArchiveRequest(false, false));

            assertFalse(board.isArchived());
            verify(taskRepository, never()).archiveByBoardId(any(), any());
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
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardUserRepository.existsByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), OTHER_USER_ID))
                    .thenReturn(false);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(userRepository.findById(OTHER_USER_ID)).thenReturn(Optional.of(otherUser));

            // When
            boardService.addCollaborator(Objects.requireNonNull(BOARD_ID), collaboratorRequest);
            // Then
            assertEquals(2, board.getCollaborators().size());
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void addCollaborator_WhenAlreadyCollaborator_ThrowsBadRequestException() {
            // Given
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
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
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(10L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);

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
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
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
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardUserRepository.existsByBoardIdAndUserId(
                            Objects.requireNonNull(BOARD_ID), OTHER_USER_ID))
                    .thenReturn(false);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(userRepository.findById(OTHER_USER_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.addCollaborator(
                                    Objects.requireNonNull(BOARD_ID), collaboratorRequest));
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
