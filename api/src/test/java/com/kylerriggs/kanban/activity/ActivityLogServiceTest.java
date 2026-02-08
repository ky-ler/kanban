package com.kylerriggs.kanban.activity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kylerriggs.kanban.activity.dto.ActivityLogDto;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import com.kylerriggs.kanban.websocket.BoardEventPublisher;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceTest {
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");
    private static final UUID TASK_ID = UUID.fromString("b256c2d0-891b-44de-816b-c9259cd00392");
    private static final UUID ACTIVITY_ID = UUID.fromString("c356c2d0-891b-44de-816b-c9259cd00393");

    @Mock private ActivityLogRepository activityLogRepository;
    @Mock private ActivityLogMapper activityLogMapper;
    @Mock private TaskRepository taskRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private BoardEventPublisher eventPublisher;

    @InjectMocks private ActivityLogService activityLogService;

    @Test
    void getActivityForTask_WhenTaskIsNotInBoard_ThrowsResourceNotFoundException() {
        when(taskRepository.existsByIdAndBoardId(TASK_ID, BOARD_ID)).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> activityLogService.getActivityForTask(BOARD_ID, TASK_ID));

        verify(activityLogRepository, never()).findByTaskIdOrderByDateCreatedDesc(any());
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
                        new UserSummaryDto("auth0|user", "user", "https://img"),
                        "2026-01-01T00:00:00Z");

        when(taskRepository.existsByIdAndBoardId(TASK_ID, BOARD_ID)).thenReturn(true);
        when(activityLogRepository.findByTaskIdOrderByDateCreatedDesc(TASK_ID))
                .thenReturn(List.of(activityLog));
        when(activityLogMapper.toDto(activityLog)).thenReturn(dto);

        List<ActivityLogDto> result = activityLogService.getActivityForTask(BOARD_ID, TASK_ID);

        assertEquals(1, result.size());
        assertEquals(ACTIVITY_ID, result.get(0).id());
    }
}
