package com.kylerriggs.kanban.activity;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.kylerriggs.kanban.activity.dto.ActivityLogDto;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.UserLookupService;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceTest {
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");
    private static final UUID TASK_ID = UUID.fromString("b256c2d0-891b-44de-816b-c9259cd00392");
    private static final UUID ACTIVITY_ID = UUID.fromString("c356c2d0-891b-44de-816b-c9259cd00393");

    @Mock private ActivityLogRepository activityLogRepository;
    @Mock private ActivityLogMapper activityLogMapper;
    @Mock private TaskRepository taskRepository;
    @Mock private UserLookupService userLookupService;
    @Mock private BoardEventPublisher eventPublisher;

    @InjectMocks private ActivityLogService activityLogService;

    @Test
    void getActivityForTask_WhenTaskIsNotInBoard_ThrowsResourceNotFoundException() {
        when(taskRepository.existsByIdAndBoardId(TASK_ID, BOARD_ID)).thenReturn(false);

        ResourceNotFoundException exception =
                assertThrows(
                        ResourceNotFoundException.class,
                        () -> activityLogService.getActivityForTask(BOARD_ID, TASK_ID, 0, 20));
        assertNotNull(exception);

        verify(activityLogRepository, never())
                .findByTaskIdOrderByDateCreatedDesc(any(), any(Pageable.class));
    }

    @Test
    void getActivityForTask_WhenTaskBelongsToBoard_ReturnsActivity() {
        ActivityLog activityLog = new ActivityLog();
        ActivityLogDto dto =
                new ActivityLogDto(
                        ACTIVITY_ID,
                        ActivityType.TASK_UPDATED.name(),
                        null,
                        TASK_ID,
                        "Test Task",
                        new UserSummaryDto("auth0|user", "user", "https://img"),
                        "2026-01-01T00:00:00Z");

        when(taskRepository.existsByIdAndBoardId(TASK_ID, BOARD_ID)).thenReturn(true);
        when(activityLogRepository.findByTaskIdOrderByDateCreatedDesc(
                        TASK_ID, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(activityLog)));
        when(activityLogMapper.toDto(activityLog)).thenReturn(dto);

        Page<ActivityLogDto> result =
                activityLogService.getActivityForTask(BOARD_ID, TASK_ID, 0, 20);

        assertEquals(1, result.getTotalElements());
        assertEquals(ACTIVITY_ID, result.getContent().get(0).id());
    }
}
