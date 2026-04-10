package com.kylerriggs.velora.task;

import com.kylerriggs.velora.exception.BadRequestException;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskArchiveService {
    private static final long GAP = 1_000_000L;

    private final TaskRepository taskRepository;

    public void archiveTask(@NonNull Task task) {
        if (task.isArchived()) {
            return;
        }

        task.setRestorePosition(task.getPosition());
        task.setArchived(true);
        task.setPosition(nextArchivedPosition(task.getColumn().getId()));
    }

    public void archiveTasks(@NonNull Collection<Task> tasks) {
        tasks.stream()
                .filter(task -> !task.isArchived())
                .sorted(
                        Comparator.comparing((Task task) -> task.getColumn().getId())
                                .thenComparing(Task::getPosition))
                .forEach(this::archiveTask);
    }

    public void restoreTask(@NonNull Task task) {
        if (!task.isArchived()) {
            return;
        }

        if (task.getBoard().isArchived()) {
            throw new BadRequestException(
                    "Board is archived. Unarchive the board before restoring tasks.");
        }

        if (task.getColumn().isArchived()) {
            throw new BadRequestException(
                    "Column is archived. Unarchive the column before restoring tasks.");
        }

        long restoredPosition =
                computeRestorePosition(
                        task.getColumn().getId(), task.getRestorePosition(), task.getId());

        task.setArchived(false);
        task.setPosition(restoredPosition);
        task.setRestorePosition(null);
    }

    private long nextArchivedPosition(UUID columnId) {
        return taskRepository.findMaxPositionByColumnId(columnId).orElse(0L) + GAP;
    }

    private long computeRestorePosition(
            UUID columnId, Long requestedPosition, UUID restoringTaskId) {
        List<Task> activeTasks =
                taskRepository.findByColumnIdAndIsArchivedFalseOrderByPosition(columnId);

        if (activeTasks.isEmpty()) {
            return GAP;
        }

        if (requestedPosition == null) {
            return activeTasks.get(activeTasks.size() - 1).getPosition() + GAP;
        }

        Task afterTask = null;
        Task beforeTask = null;
        for (Task candidate : activeTasks) {
            if (candidate.getId().equals(restoringTaskId)) {
                continue;
            }
            if (candidate.getPosition() <= requestedPosition) {
                afterTask = candidate;
                continue;
            }
            beforeTask = candidate;
            break;
        }

        return computePositionBetweenNeighbors(columnId, afterTask, beforeTask, restoringTaskId);
    }

    private long computePositionBetweenNeighbors(
            UUID columnId, Task afterTask, Task beforeTask, UUID restoringTaskId) {
        Long afterPos = afterTask != null ? afterTask.getPosition() : null;
        Long beforePos = beforeTask != null ? beforeTask.getPosition() : null;

        if (afterPos != null && beforePos == null) {
            return afterPos + GAP;
        }

        if (afterPos == null && beforePos != null) {
            long position = beforePos / 2;
            if (position <= 0 || position == beforePos) {
                rebalanceActiveColumn(columnId, restoringTaskId);
                beforePos =
                        taskRepository
                                .findByColumnIdAndIsArchivedFalseOrderByPosition(columnId)
                                .stream()
                                .filter(task -> task.getId().equals(beforeTask.getId()))
                                .findFirst()
                                .map(Task::getPosition)
                                .orElseThrow(
                                        () ->
                                                new BadRequestException(
                                                        "Unable to restore task position."));
                position = beforePos / 2;
            }
            return position;
        }

        if (afterPos != null && beforePos != null) {
            long midpoint = afterPos + (beforePos - afterPos) / 2;
            if (midpoint <= afterPos || midpoint >= beforePos) {
                rebalanceActiveColumn(columnId, restoringTaskId);
                List<Task> rebalancedTasks =
                        taskRepository.findByColumnIdAndIsArchivedFalseOrderByPosition(columnId);
                afterPos =
                        rebalancedTasks.stream()
                                .filter(task -> task.getId().equals(afterTask.getId()))
                                .findFirst()
                                .map(Task::getPosition)
                                .orElseThrow(
                                        () ->
                                                new BadRequestException(
                                                        "Unable to restore task position."));
                beforePos =
                        rebalancedTasks.stream()
                                .filter(task -> task.getId().equals(beforeTask.getId()))
                                .findFirst()
                                .map(Task::getPosition)
                                .orElseThrow(
                                        () ->
                                                new BadRequestException(
                                                        "Unable to restore task position."));
                midpoint = afterPos + (beforePos - afterPos) / 2;
                if (midpoint <= afterPos || midpoint >= beforePos) {
                    throw new BadRequestException("Unable to restore task position.");
                }
            }
            return midpoint;
        }

        return GAP;
    }

    private void rebalanceActiveColumn(UUID columnId, UUID excludingTaskId) {
        List<Task> activeTasks =
                taskRepository.findByColumnIdAndIsArchivedFalseOrderByPosition(columnId);
        long position = GAP;
        for (Task task : activeTasks) {
            if (!task.getId().equals(excludingTaskId)) {
                taskRepository.updatePosition(task.getId(), position);
                position += GAP;
            }
        }
    }
}
