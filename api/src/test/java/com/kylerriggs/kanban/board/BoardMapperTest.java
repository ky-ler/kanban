package com.kylerriggs.kanban.board;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.board.dto.BoardDto;
import com.kylerriggs.kanban.board.dto.BoardSummary;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskMapper;
import com.kylerriggs.kanban.task.dto.TaskSummaryDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserMapper;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class BoardMapperTest {

    private static final UUID BOARD_ID = UUID.randomUUID();
    private static final String CREATOR_ID = "auth0|creator123";
    private static final String OTHER_USER_ID = "auth0|other456";
    private static final String BOARD_NAME = "Test Board";
    private static final String BOARD_DESCRIPTION = "Test Description";

    @Mock private UserMapper userMapper;
    @Mock private TaskMapper taskMapper;

    private BoardMapper boardMapper;

    @BeforeEach
    void setUp() {
        boardMapper = new BoardMapper(userMapper, taskMapper);
    }

    private User createUser(String id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setProfileImageUrl("https://example.com/" + username + ".jpg");
        return user;
    }

    private Board createBoard(User creator) {
        Board board = new Board();
        board.setId(BOARD_ID);
        board.setName(BOARD_NAME);
        board.setDescription(BOARD_DESCRIPTION);
        board.setCreatedBy(creator);
        board.setArchived(false);
        board.setDateCreated(Instant.now());
        board.setDateModified(Instant.now());
        board.setCollaborators(new HashSet<>());
        board.setTasks(new HashSet<>());
        board.setColumns(new HashSet<>());
        return board;
    }

    private BoardUser createBoardUser(Board board, User user, BoardRole role, boolean isFavorite) {
        BoardUser boardUser = new BoardUser();
        boardUser.setBoard(board);
        boardUser.setUser(user);
        boardUser.setRole(role);
        boardUser.setFavorite(isFavorite);
        return boardUser;
    }

    @Nested
    class ToDto {

        @Test
        void toDto_WithEmptyCollections_ShouldMapCorrectly() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);

            // When
            BoardDto result = boardMapper.toDto(board, CREATOR_ID);

            // Then
            assertEquals(BOARD_ID, result.id());
            assertEquals(BOARD_NAME, result.name());
            assertEquals(BOARD_DESCRIPTION, result.description());
            assertEquals(creatorSummary, result.createdBy());
            assertEquals(0, result.collaborators().length);
            assertEquals(0, result.tasks().length);
            assertEquals(0, result.columns().length);
            assertFalse(result.isArchived());
            assertFalse(result.isFavorite());
            assertNotNull(result.dateCreated());
            assertNotNull(result.dateModified());
        }

        @Test
        void toDto_WhenUserHasFavorite_ShouldReflectFavoriteStatus() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            BoardUser boardUser = createBoardUser(board, creator, BoardRole.ADMIN, true);
            board.setCollaborators(Set.of(boardUser));

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);

            // When
            BoardDto result = boardMapper.toDto(board, CREATOR_ID);

            // Then
            assertTrue(result.isFavorite());
        }

        @Test
        void toDto_WhenOtherUserHasFavorite_ShouldNotShowAsFavoriteForCurrentUser() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            User otherUser = createUser(OTHER_USER_ID, "other");
            Board board = createBoard(creator);

            BoardUser creatorMembership = createBoardUser(board, creator, BoardRole.ADMIN, false);
            BoardUser otherMembership = createBoardUser(board, otherUser, BoardRole.MEMBER, true);
            board.setCollaborators(Set.of(creatorMembership, otherMembership));

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            UserSummaryDto otherSummary =
                    new UserSummaryDto(OTHER_USER_ID, "other", "https://example.com/other.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);
            when(userMapper.toSummaryDto(otherUser)).thenReturn(otherSummary);

            // When
            BoardDto result = boardMapper.toDto(board, CREATOR_ID);

            // Then
            assertFalse(result.isFavorite());
        }

        @Test
        void toDto_WithCollaborators_ShouldMapCollaborators() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            User collaborator = createUser("auth0|collab", "collab");
            BoardUser boardUser = createBoardUser(board, collaborator, BoardRole.MEMBER, false);
            board.setCollaborators(Set.of(boardUser));

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            UserSummaryDto collabSummary =
                    new UserSummaryDto("auth0|collab", "collab", "https://example.com/collab.jpg");

            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);
            when(userMapper.toSummaryDto(collaborator)).thenReturn(collabSummary);

            // When
            BoardDto result = boardMapper.toDto(board, CREATOR_ID);

            // Then
            assertEquals(1, result.collaborators().length);
            assertEquals(collabSummary, result.collaborators()[0].user());
            assertEquals(BoardRole.MEMBER, result.collaborators()[0].role());
        }

        @Test
        void toDto_WithTasks_ShouldMapTasks() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            Column column = new Column();
            column.setId(UUID.randomUUID());
            column.setBoard(board);

            Task task = new Task();
            task.setId(UUID.randomUUID());
            task.setTitle("Task 1");
            task.setBoard(board);
            task.setColumn(column);
            task.setCreatedBy(creator);
            board.setTasks(Set.of(task));

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            TaskSummaryDto taskSummary =
                    new TaskSummaryDto(
                            task.getId(),
                            "Task 1",
                            column.getId(),
                            null,
                            0L,
                            false,
                            false,
                            null,
                            null,
                            null,
                            0L,
                            false);

            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);
            when(taskMapper.toSummaryDto(task, 0L)).thenReturn(taskSummary);

            // When
            BoardDto result = boardMapper.toDto(board, CREATOR_ID);

            // Then
            assertEquals(1, result.tasks().length);
            assertEquals(taskSummary, result.tasks()[0]);
        }

        @Test
        void toDto_WithColumns_ShouldMapColumns() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            Column column = new Column();
            column.setId(UUID.randomUUID());
            column.setName("To Do");
            column.setPosition(0);
            column.setBoard(board);
            board.setColumns(Set.of(column));

            UserSummaryDto creatorSummary =
                    new UserSummaryDto(CREATOR_ID, "creator", "https://example.com/creator.jpg");
            when(userMapper.toSummaryDto(creator)).thenReturn(creatorSummary);

            // When
            BoardDto result = boardMapper.toDto(board, CREATOR_ID);

            // Then
            assertEquals(1, result.columns().length);
            assertEquals(column.getId(), result.columns()[0].id());
            assertEquals("To Do", result.columns()[0].name());
            assertEquals(0, result.columns()[0].position());
        }
    }

    @Nested
    class ToSummaryDto {

        @Test
        void toSummaryDto_WithNoTasks_ShouldHaveZeroCounts() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            // When
            BoardSummary result = boardMapper.toSummaryDto(board, CREATOR_ID);

            // Then
            assertEquals(BOARD_ID, result.id());
            assertEquals(BOARD_NAME, result.name());
            assertEquals(BOARD_DESCRIPTION, result.description());
            assertEquals(0, result.completedTasks());
            assertEquals(0, result.totalTasks());
            assertFalse(result.isArchived());
            assertFalse(result.isFavorite());
            assertNotNull(result.dateModified());
        }

        @Test
        void toSummaryDto_WithMixedTasks_ShouldCountCorrectly() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            Column column = new Column();
            column.setId(UUID.randomUUID());
            column.setBoard(board);

            Task completedTask = new Task();
            completedTask.setId(UUID.randomUUID());
            completedTask.setCompleted(true);
            completedTask.setColumn(column);
            completedTask.setCreatedBy(creator);

            Task incompleteTask1 = new Task();
            incompleteTask1.setId(UUID.randomUUID());
            incompleteTask1.setCompleted(false);
            incompleteTask1.setColumn(column);
            incompleteTask1.setCreatedBy(creator);

            Task incompleteTask2 = new Task();
            incompleteTask2.setId(UUID.randomUUID());
            incompleteTask2.setCompleted(false);
            incompleteTask2.setColumn(column);
            incompleteTask2.setCreatedBy(creator);

            board.setTasks(Set.of(completedTask, incompleteTask1, incompleteTask2));

            // When
            BoardSummary result = boardMapper.toSummaryDto(board, CREATOR_ID);

            // Then
            assertEquals(1, result.completedTasks());
            assertEquals(3, result.totalTasks());
        }

        @Test
        void toSummaryDto_WhenUserHasFavorite_ShouldReflectStatus() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);

            BoardUser boardUser = createBoardUser(board, creator, BoardRole.ADMIN, true);
            board.setCollaborators(Set.of(boardUser));

            // When
            BoardSummary result = boardMapper.toSummaryDto(board, CREATOR_ID);

            // Then
            assertTrue(result.isFavorite());
        }

        @Test
        void toSummaryDto_WhenArchived_ShouldReflectStatus() {
            // Given
            User creator = createUser(CREATOR_ID, "creator");
            Board board = createBoard(creator);
            board.setArchived(true);

            // When
            BoardSummary result = boardMapper.toSummaryDto(board, CREATOR_ID);

            // Then
            assertTrue(result.isArchived());
        }
    }
}
