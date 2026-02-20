package com.kylerriggs.kanban.column;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.column.dto.ColumnArchiveRequest;
import com.kylerriggs.kanban.column.dto.ColumnDto;
import com.kylerriggs.kanban.column.dto.CreateColumnRequest;
import com.kylerriggs.kanban.column.dto.MoveColumnRequest;
import com.kylerriggs.kanban.column.dto.UpdateColumnRequest;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ColumnServiceTest {

    private static final String USER_ID = "auth0|user123";
    private static final UUID BOARD_ID = UUID.fromString("b256c2d0-891b-44de-816b-c9259cd00392");
    private static final UUID COLUMN_ID = UUID.fromString("c356c2d0-891b-44de-816b-c9259cd00393");

    @Mock private ColumnRepository columnRepository;
    @Mock private ColumnMapper columnMapper;
    @Mock private BoardRepository boardRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private BoardEventPublisher eventPublisher;
    @InjectMocks private ColumnService columnService;

    private User user;
    private Board board;
    private Column column;
    private ColumnDto columnDto;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(USER_ID);
        user.setUsername("testuser");

        board =
                Board.builder()
                        .id(BOARD_ID)
                        .name("Test Board")
                        .createdBy(user)
                        .tasks(new HashSet<>())
                        .collaborators(new HashSet<>())
                        .columns(new HashSet<>())
                        .build();

        column = Column.builder().id(COLUMN_ID).name("To Do").position(0).board(board).build();

        columnDto = new ColumnDto(COLUMN_ID, "To Do", 0, false);
    }

    @Nested
    class CreateColumnTests {
        @Test
        void createColumn_WithoutPosition_AppendsToEnd() {
            // Given
            CreateColumnRequest request = new CreateColumnRequest("New Column", null);
            Column newColumn =
                    Column.builder()
                            .id(UUID.randomUUID())
                            .name("New Column")
                            .position(3)
                            .board(board)
                            .build();
            ColumnDto newColumnDto = new ColumnDto(newColumn.getId(), "New Column", 3, false);

            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(columnRepository.findMaxPositionByBoardId(BOARD_ID)).thenReturn(2);
            when(columnRepository.save(any(Column.class))).thenReturn(newColumn);
            when(columnMapper.toDto(newColumn)).thenReturn(newColumnDto);

            // When
            ColumnDto result = columnService.createColumn(BOARD_ID, request);

            // Then
            assertEquals("New Column", result.name());
            assertEquals(3, result.position());
            verify(columnRepository, never()).incrementPositionsFrom(any(), anyInt());
            verify(boardRepository).save(Objects.requireNonNull(board));
            verify(eventPublisher).publish(eq("COLUMN_CREATED"), eq(BOARD_ID), any());
        }

        @Test
        void createColumn_WithPosition_ShiftsExistingColumns() {
            // Given
            CreateColumnRequest request = new CreateColumnRequest("New Column", 1);
            Column newColumn =
                    Column.builder()
                            .id(UUID.randomUUID())
                            .name("New Column")
                            .position(1)
                            .board(board)
                            .build();
            ColumnDto newColumnDto = new ColumnDto(newColumn.getId(), "New Column", 1, false);

            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.of(board));
            when(columnRepository.save(any(Column.class))).thenReturn(newColumn);
            when(columnMapper.toDto(newColumn)).thenReturn(newColumnDto);

            // When
            ColumnDto result = columnService.createColumn(BOARD_ID, request);

            // Then
            assertEquals(1, result.position());
            verify(columnRepository).incrementPositionsFrom(BOARD_ID, 1);
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void createColumn_WhenBoardNotFound_ThrowsException() {
            // Given
            CreateColumnRequest request = new CreateColumnRequest("New Column", null);
            when(boardRepository.findById(Objects.requireNonNull(BOARD_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> columnService.createColumn(BOARD_ID, request));
        }
    }

    @Nested
    class UpdateColumnTests {
        @Test
        void updateColumn_Success() {
            // Given
            UpdateColumnRequest request = new UpdateColumnRequest("Renamed Column");
            ColumnDto updatedDto = new ColumnDto(COLUMN_ID, "Renamed Column", 0, false);

            when(columnRepository.findById(Objects.requireNonNull(COLUMN_ID)))
                    .thenReturn(Optional.of(column));
            when(columnRepository.save(Objects.requireNonNull(column))).thenReturn(column);
            when(columnMapper.toDto(column)).thenReturn(updatedDto);

            // When
            ColumnDto result = columnService.updateColumn(COLUMN_ID, request);

            // Then
            assertEquals("Renamed Column", result.name());
            verify(boardRepository).save(Objects.requireNonNull(board));
            verify(eventPublisher).publish(eq("COLUMN_UPDATED"), eq(BOARD_ID), any());
        }

        @Test
        void updateColumn_WhenNotFound_ThrowsException() {
            // Given
            UpdateColumnRequest request = new UpdateColumnRequest("Renamed Column");
            when(columnRepository.findById(Objects.requireNonNull(COLUMN_ID)))
                    .thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> columnService.updateColumn(COLUMN_ID, request));
        }
    }

    @Nested
    class UpdateColumnArchiveTests {
        @Test
        void updateColumnArchive_WhenColumnHasUnarchivedTasksWithoutConfirm_ThrowsBadRequest() {
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(taskRepository.countByColumnIdAndIsArchivedFalse(COLUMN_ID)).thenReturn(3L);

            assertThrows(
                    BadRequestException.class,
                    () ->
                            columnService.updateColumnArchive(
                                    BOARD_ID, COLUMN_ID, new ColumnArchiveRequest(true, false)));
        }

        @Test
        void updateColumnArchive_WhenConfirmed_ArchivesColumnAndTasks() {
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(taskRepository.countByColumnIdAndIsArchivedFalse(COLUMN_ID)).thenReturn(2L);
            when(columnRepository.save(column)).thenReturn(column);
            when(columnMapper.toDto(column)).thenReturn(columnDto);

            ColumnDto result =
                    columnService.updateColumnArchive(
                            BOARD_ID, COLUMN_ID, new ColumnArchiveRequest(true, true));

            assertTrue(column.isArchived());
            assertEquals(COLUMN_ID, result.id());
            verify(taskRepository).archiveByColumnId(eq(COLUMN_ID), any());
            verify(boardRepository).touchDateModified(eq(BOARD_ID), any());
            verify(eventPublisher).publish("COLUMN_UPDATED", BOARD_ID, COLUMN_ID);
        }

        @Test
        void updateColumnArchive_WhenUnarchiving_DoesNotUnarchiveTasks() {
            column.setArchived(true);
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(columnRepository.save(column)).thenReturn(column);
            when(columnMapper.toDto(column)).thenReturn(columnDto);

            columnService.updateColumnArchive(
                    BOARD_ID, COLUMN_ID, new ColumnArchiveRequest(false, false));

            assertFalse(column.isArchived());
            verify(taskRepository, never()).archiveByColumnId(any(), any());
        }
    }

    @Nested
    class DeleteColumnTests {
        @Test
        void deleteColumn_Success() {
            // Given
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(columnRepository.hasTasksInColumn(COLUMN_ID)).thenReturn(false);

            // When
            columnService.deleteColumn(COLUMN_ID);

            // Then
            verify(columnRepository).decrementPositionsAfter(BOARD_ID, 0);
            verify(columnRepository).delete(Objects.requireNonNull(column));
            verify(boardRepository).save(Objects.requireNonNull(board));
            verify(eventPublisher).publish(eq("COLUMN_DELETED"), eq(BOARD_ID), any());
        }

        @Test
        void deleteColumn_WithTasks_ThrowsException() {
            // Given
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(columnRepository.hasTasksInColumn(COLUMN_ID)).thenReturn(true);

            // When & Then
            assertThrows(BadRequestException.class, () -> columnService.deleteColumn(COLUMN_ID));
            verify(columnRepository, never()).delete(any(Column.class));
        }

        @Test
        void deleteColumn_WhenNotFound_ThrowsException() {
            // Given
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class, () -> columnService.deleteColumn(COLUMN_ID));
        }
    }

    @Nested
    class MoveColumnTests {
        @BeforeEach
        void setUp() {
            column.setPosition(1);
        }

        @Test
        void moveColumn_SamePosition_NoChange() {
            // Given
            MoveColumnRequest request = new MoveColumnRequest(1);
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));

            // When
            columnService.moveColumn(COLUMN_ID, request);

            // Then
            verify(columnRepository, never()).decrementPositionsInRange(any(), anyInt(), anyInt());
            verify(columnRepository, never()).incrementPositionsInRange(any(), anyInt(), anyInt());
            verify(boardRepository, never()).save(any());
        }

        @Test
        void moveColumn_Right_ShiftsPositions() {
            // Given
            MoveColumnRequest request = new MoveColumnRequest(3);
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(columnRepository.countByBoardId(BOARD_ID)).thenReturn(5L);

            // When
            columnService.moveColumn(COLUMN_ID, request);

            // Then
            assertEquals(3, column.getPosition());
            verify(columnRepository).decrementPositionsInRange(BOARD_ID, 1, 3);
            verify(boardRepository).save(Objects.requireNonNull(board));
            verify(eventPublisher).publish(eq("COLUMN_MOVED"), eq(BOARD_ID), any());
        }

        @Test
        void moveColumn_Left_ShiftsPositions() {
            // Given
            column.setPosition(3);
            MoveColumnRequest request = new MoveColumnRequest(1);
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(columnRepository.countByBoardId(BOARD_ID)).thenReturn(5L);

            // When
            columnService.moveColumn(COLUMN_ID, request);

            // Then
            assertEquals(1, column.getPosition());
            verify(columnRepository).incrementPositionsInRange(BOARD_ID, 1, 3);
            verify(boardRepository).save(Objects.requireNonNull(board));
        }

        @Test
        void moveColumn_InvalidPosition_ThrowsException() {
            // Given
            MoveColumnRequest request = new MoveColumnRequest(10);
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.of(column));
            when(columnRepository.countByBoardId(BOARD_ID)).thenReturn(5L);

            // When & Then
            assertThrows(
                    BadRequestException.class, () -> columnService.moveColumn(COLUMN_ID, request));
        }

        @Test
        void moveColumn_WhenNotFound_ThrowsException() {
            // Given
            MoveColumnRequest request = new MoveColumnRequest(0);
            when(columnRepository.findByIdWithLock(COLUMN_ID)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(
                    ResourceNotFoundException.class,
                    () -> columnService.moveColumn(COLUMN_ID, request));
        }
    }
}
