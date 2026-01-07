package com.kylerriggs.kanban.board;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

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
import com.kylerriggs.kanban.sse.SseService;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

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
    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private BoardMapper boardMapper;
    @Mock private TaskMapper taskMapper;
    @Mock private UserService userService;
    @Mock private BoardProperties boardProperties;
    @Mock private SseService sseService;
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
                                Board savedBoard = inv.getArgument(0);
                                savedBoard.setId(BOARD_ID);
                                savedBoard.setDateCreated(Instant.now());
                                savedBoard.setDateModified(Instant.now());
                                return savedBoard;
                            });
            when(boardMapper.toDto(any(Board.class), eq(true))).thenReturn(boardDto);

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
        void createBoard_WhenUserHasNoDefaultBoard_SetsAsDefault() {
            // Given
            user.setDefaultBoard(null);
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(boardRepository.countByCollaboratorsUserId(USER_ID)).thenReturn(0L);
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardProperties.getDefaultColumns()).thenReturn(List.of("To Do", "Done"));
            when(boardRepository.save(any(Board.class)))
                    .thenAnswer(
                            inv -> {
                                Board savedBoard = inv.getArgument(0);
                                savedBoard.setId(BOARD_ID);
                                savedBoard.setDateCreated(Instant.now());
                                savedBoard.setDateModified(Instant.now());
                                return savedBoard;
                            });
            when(boardMapper.toDto(any(Board.class), eq(true))).thenReturn(boardDto);

            // When
            boardService.createBoard(boardRequest);

            // Then
            assertNotNull(user.getDefaultBoard());
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
        void createBoard_WhenUserNotAuthenticated_ThrowsResourceNotFoundException() {
            // Given
            when(userService.getCurrentUserId()).thenReturn(null);

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class, () -> boardService.createBoard(boardRequest));
        }
    }

    @Nested
    class GetBoardTests {
        @Test
        void getBoard_WhenBoardExists_ReturnsBoardDto() {
            // Given
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findDefaultBoardIdById(USER_ID)).thenReturn(Optional.of(BOARD_ID));
            when(boardMapper.toDto(board, true)).thenReturn(boardDto);

            // When
            BoardDto result = boardService.getBoard(BOARD_ID);

            // Then
            assertNotNull(result);
            verify(boardMapper).toDto(board, true);
        }

        @Test
        void getBoard_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(ResourceNotFoundException.class, () -> boardService.getBoard(BOARD_ID));
        }

        @Test
        void getBoard_WhenNotDefaultBoard_PassesFalseToMapper() {
            // Given
            UUID differentBoardId = UUID.randomUUID();
            when(boardRepository.findByIdWithDetails(BOARD_ID)).thenReturn(Optional.of(board));
            when(userService.getCurrentUserId()).thenReturn(USER_ID);
            when(userRepository.findDefaultBoardIdById(USER_ID))
                    .thenReturn(Optional.of(differentBoardId));
            when(boardMapper.toDto(board, false)).thenReturn(boardDto);

            // When
            boardService.getBoard(BOARD_ID);

            // Then
            verify(boardMapper).toDto(board, false);
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
            when(userService.getCurrentUserDefaultBoardId()).thenReturn(BOARD_ID);
            when(boardRepository.findAllByCollaboratorsUserIdWithTasksAndColumn(USER_ID))
                    .thenReturn(List.of(board));
            when(boardMapper.toSummaryDto(board, true)).thenReturn(summary);

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
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(userService.getCurrentUserDefaultBoardId()).thenReturn(BOARD_ID);
            when(boardMapper.toDto(board, true)).thenReturn(boardDto);

            // When
            BoardDto result = boardService.updateBoard(BOARD_ID, updateRequest);

            // Then
            assertEquals("Updated Board", board.getName());
            assertEquals("Updated Description", board.getDescription());
            verify(boardRepository).save(board);
            verify(sseService).broadcast(eq(BOARD_ID), any());
        }

        @Test
        void updateBoard_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> boardService.updateBoard(BOARD_ID, updateRequest));
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
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(userRepository.findById(OTHER_USER_ID)).thenReturn(Optional.of(otherUser));

            // When
            boardService.addCollaborator(BOARD_ID, collaboratorRequest);

            // Then
            assertEquals(2, board.getCollaborators().size());
            verify(boardRepository).save(board);
        }

        @Test
        void addCollaborator_WhenUserHasNoDefaultBoard_SetsAsDefault() {
            // Given
            otherUser.setDefaultBoard(null);
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(userRepository.findById(OTHER_USER_ID)).thenReturn(Optional.of(otherUser));

            // When
            boardService.addCollaborator(BOARD_ID, collaboratorRequest);

            // Then
            assertEquals(board, otherUser.getDefaultBoard());
        }

        @Test
        void addCollaborator_WhenAlreadyCollaborator_ThrowsBadRequestException() {
            // Given
            BoardUser existingCollaborator =
                    BoardUser.builder().board(board).user(otherUser).role(BoardRole.MEMBER).build();
            board.getCollaborators().add(existingCollaborator);

            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> boardService.addCollaborator(BOARD_ID, collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenUserBoardLimitExceeded_ThrowsBoardLimitExceededException() {
            // Given
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(10L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);

            // When & Then
            assertThrows(
                    BoardLimitExceededException.class,
                    () -> boardService.addCollaborator(BOARD_ID, collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenBoardNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> boardService.addCollaborator(BOARD_ID, collaboratorRequest));
        }

        @Test
        void addCollaborator_WhenUserNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.countByCollaboratorsUserId(OTHER_USER_ID)).thenReturn(0L);
            when(boardProperties.getMaxBoardsPerUser()).thenReturn(10);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));
            when(userRepository.findById(OTHER_USER_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> boardService.addCollaborator(BOARD_ID, collaboratorRequest));
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
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When
            boardService.removeCollaborator(BOARD_ID, OTHER_USER_ID);

            // Then
            assertEquals(1, board.getCollaborators().size());
            verify(boardRepository).save(board);
        }

        @Test
        void removeCollaborator_WhenOnlyCollaborator_ThrowsBadRequestException() {
            // Given
            board.getCollaborators().clear();
            BoardUser soleCollaborator =
                    BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(soleCollaborator);

            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> boardService.removeCollaborator(BOARD_ID, USER_ID));
        }

        @Test
        void removeCollaborator_WhenLastAdmin_ThrowsBadRequestException() {
            // Given - user is only admin, otherUser is member
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> boardService.removeCollaborator(BOARD_ID, USER_ID));
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
                            .position(0)
                            .build();
            board.getTasks().add(task);

            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When
            boardService.removeCollaborator(BOARD_ID, OTHER_USER_ID);

            // Then
            assertNull(task.getAssignedTo());
        }

        @Test
        void removeCollaborator_WhenBoardIsDefaultForUser_ClearsDefault() {
            // Given
            otherUser.setDefaultBoard(board);
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When
            boardService.removeCollaborator(BOARD_ID, OTHER_USER_ID);

            // Then
            assertNull(otherUser.getDefaultBoard());
            verify(userRepository).save(otherUser);
        }

        @Test
        void removeCollaborator_WhenNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> boardService.removeCollaborator(BOARD_ID, "nonexistentUser"));
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
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When
            boardService.updateCollaboratorRole(BOARD_ID, OTHER_USER_ID, BoardRole.ADMIN);

            // Then
            assertEquals(BoardRole.ADMIN, otherBoardUser.getRole());
            verify(boardRepository).save(board);
        }

        @Test
        void updateCollaboratorRole_WhenDemotingLastAdmin_ThrowsBadRequestException() {
            // Given - user is the only admin
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> boardService.updateCollaboratorRole(BOARD_ID, USER_ID, BoardRole.MEMBER));
        }

        @Test
        void updateCollaboratorRole_WhenOnlyCollaborator_MustRemainAdmin() {
            // Given
            board.getCollaborators().clear();
            BoardUser soleCollaborator =
                    BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(soleCollaborator);

            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    BadRequestException.class,
                    () -> boardService.updateCollaboratorRole(BOARD_ID, USER_ID, BoardRole.MEMBER));
        }

        @Test
        void updateCollaboratorRole_WhenOnlyCollaboratorSameRole_NoChange() {
            // Given
            board.getCollaborators().clear();
            BoardUser soleCollaborator =
                    BoardUser.builder().board(board).user(user).role(BoardRole.ADMIN).build();
            board.getCollaborators().add(soleCollaborator);

            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When
            boardService.updateCollaboratorRole(BOARD_ID, USER_ID, BoardRole.ADMIN);

            // Then - no exception, role unchanged
            assertEquals(BoardRole.ADMIN, soleCollaborator.getRole());
        }

        @Test
        void updateCollaboratorRole_WhenCollaboratorNotFound_ThrowsResourceNotFoundException() {
            // Given
            when(boardRepository.findById(BOARD_ID)).thenReturn(Optional.of(board));

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () ->
                            boardService.updateCollaboratorRole(
                                    BOARD_ID, "nonexistentUser", BoardRole.ADMIN));
        }
    }
}
