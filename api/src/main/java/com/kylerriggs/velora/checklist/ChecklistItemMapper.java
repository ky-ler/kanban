package com.kylerriggs.velora.checklist;

import com.kylerriggs.velora.checklist.dto.ChecklistItemDto;
import com.kylerriggs.velora.checklist.dto.ChecklistItemRequest;
import com.kylerriggs.velora.checklist.dto.ChecklistProgressDto;
import com.kylerriggs.velora.task.Task;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserMapper;
import com.kylerriggs.velora.user.dto.UserSummaryDto;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChecklistItemMapper {
    private final UserMapper userMapper;

    public ChecklistItemDto toDto(ChecklistItem item) {
        UserSummaryDto assignedTo =
                item.getAssignedTo() != null ? userMapper.toSummaryDto(item.getAssignedTo()) : null;

        return new ChecklistItemDto(
                item.getId(),
                item.getTask().getId(),
                item.getTitle(),
                item.isCompleted(),
                assignedTo,
                item.getDueDate(),
                item.getPosition(),
                item.getDateCreated() != null ? item.getDateCreated().toString() : null,
                item.getDateModified() != null ? item.getDateModified().toString() : null);
    }

    public ChecklistItem toEntity(
            ChecklistItemRequest request, Task task, User assignee, long position) {
        return ChecklistItem.builder()
                .title(request.title())
                .isCompleted(request.isCompleted() != null && request.isCompleted())
                .dueDate(request.dueDate())
                .task(task)
                .assignedTo(assignee)
                .position(position)
                .build();
    }

    public ChecklistProgressDto toProgressDto(long total, long completed) {
        return new ChecklistProgressDto((int) total, (int) completed);
    }
}
