package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ForbiddenException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isCollaborator(@NonNull UUID taskId) {
        String requestUserId = currentUserId();
        boolean requestUserIsCollaborator =
                taskRepository.isUserAuthorizedForTask(taskId, requestUserId);
        if (!requestUserIsCollaborator) {
            log.warn("Access denied: User {} is not authorized for task {}", requestUserId, taskId);
            throw new ForbiddenException("Not authorized for this task");
        }
        return true;
    }
}
