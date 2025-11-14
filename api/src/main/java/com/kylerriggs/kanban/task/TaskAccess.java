package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.common.BaseAccess;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("taskAccess")
@AllArgsConstructor
@Slf4j
public class TaskAccess extends BaseAccess {
    private final TaskRepository taskRepository;

    /**
     * Checks if the current user is a collaborator/creator of the board that the column belongs to.
     * All board collaborators have access to view and modify tasks.
     */
    public boolean isCollaborator(UUID taskId) {
        String requestUserId = currentUserId();
        return taskRepository.isUserAuthorizedForTask(taskId, requestUserId);
    }
}
