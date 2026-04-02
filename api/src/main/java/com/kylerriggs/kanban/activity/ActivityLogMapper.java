package com.kylerriggs.kanban.activity;

import com.kylerriggs.kanban.activity.dto.ActivityLogDto;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.user.UserMapper;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActivityLogMapper {
    private final UserMapper userMapper;

    public ActivityLogDto toDto(ActivityLog activityLog) {
        UserSummaryDto user = userMapper.toSummaryDto(activityLog.getUser());
        Task task = activityLog.getTask();

        return new ActivityLogDto(
                activityLog.getId(),
                activityLog.getType().name(),
                activityLog.getDetails(),
                task != null ? task.getId() : null,
                task != null ? task.getTitle() : null,
                user,
                activityLog.getDateCreated() != null
                        ? activityLog.getDateCreated().toString()
                        : null);
    }
}
