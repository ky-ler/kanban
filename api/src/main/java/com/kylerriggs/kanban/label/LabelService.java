package com.kylerriggs.kanban.label;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.label.dto.LabelDto;
import com.kylerriggs.kanban.label.dto.LabelRequest;
import com.kylerriggs.kanban.label.dto.LabelSummaryDto;
import com.kylerriggs.kanban.sse.BoardEventPublisher;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.task.TaskRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LabelService {
    private final LabelRepository labelRepository;
    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final LabelMapper labelMapper;
    private final BoardEventPublisher eventPublisher;

    /**
     * Creates a new label for a board.
     *
     * @param request the label creation request
     * @return the created label as a DTO
     * @throws ResourceNotFoundException if the board doesn't exist
     */
    @Transactional
    public LabelDto createLabel(@NonNull LabelRequest request) {
        Board board =
                boardRepository
                        .findById(request.boardId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Board not found: " + request.boardId()));

        Label label = labelMapper.toEntity(request, board);
        Label savedLabel = labelRepository.save(label);

        board.setDateModified(Instant.now());
        boardRepository.save(board);

        eventPublisher.publish("LABEL_CREATED", board.getId(), savedLabel.getId());

        return labelMapper.toDto(savedLabel);
    }

    /**
     * Updates an existing label.
     *
     * @param labelId the ID of the label to update
     * @param request the update request
     * @return the updated label as a DTO
     * @throws ResourceNotFoundException if the label doesn't exist
     */
    @Transactional
    public LabelDto updateLabel(@NonNull UUID labelId, @NonNull LabelRequest request) {
        Label label =
                labelRepository
                        .findByIdWithBoard(labelId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Label not found: " + labelId));

        label.setName(request.name());
        label.setColor(request.color());

        Label updatedLabel = labelRepository.save(label);

        Board board = label.getBoard();
        board.setDateModified(Instant.now());
        boardRepository.save(board);

        eventPublisher.publish("LABEL_UPDATED", board.getId(), labelId);

        return labelMapper.toDto(updatedLabel);
    }

    /**
     * Deletes a label. The label is automatically removed from all tasks.
     *
     * @param labelId the ID of the label to delete
     * @throws ResourceNotFoundException if the label doesn't exist
     */
    @Transactional
    public void deleteLabel(@NonNull UUID labelId) {
        Label label =
                labelRepository
                        .findByIdWithBoard(labelId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Label not found: " + labelId));

        Board board = label.getBoard();
        UUID boardId = board.getId();

        // Remove label from all tasks before deleting
        for (Task task : label.getTasks()) {
            task.getLabels().remove(label);
        }

        labelRepository.delete(label);

        board.setDateModified(Instant.now());
        boardRepository.save(board);

        eventPublisher.publish("LABEL_DELETED", boardId, labelId);
    }

    /**
     * Retrieves all labels for a board.
     *
     * @param boardId the board ID
     * @return list of labels as summary DTOs
     */
    public List<LabelSummaryDto> getLabelsByBoard(@NonNull UUID boardId) {
        return labelRepository.findByBoardId(boardId).stream()
                .map(labelMapper::toSummaryDto)
                .toList();
    }

    /**
     * Retrieves a single label by ID.
     *
     * @param labelId the label ID
     * @return the label as a DTO
     * @throws ResourceNotFoundException if the label doesn't exist
     */
    public LabelDto getLabel(@NonNull UUID labelId) {
        Label label =
                labelRepository
                        .findByIdWithBoard(labelId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Label not found: " + labelId));
        return labelMapper.toDto(label);
    }

    /**
     * Adds a label to a task.
     *
     * @param taskId the task ID
     * @param labelId the label ID
     * @throws ResourceNotFoundException if the task or label doesn't exist
     * @throws BadRequestException if the label doesn't belong to the same board as the task
     */
    @Transactional
    public void addLabelToTask(@NonNull UUID taskId, @NonNull UUID labelId) {
        Task task =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        Label label =
                labelRepository
                        .findByIdWithBoard(labelId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Label not found: " + labelId));

        if (!task.getBoard().getId().equals(label.getBoard().getId())) {
            throw new BadRequestException("Label does not belong to the same board as the task");
        }

        task.getLabels().add(label);
        taskRepository.save(task);

        Board board = task.getBoard();
        board.setDateModified(Instant.now());
        boardRepository.save(board);

        eventPublisher.publish("TASK_UPDATED", board.getId(), taskId);
    }

    /**
     * Removes a label from a task.
     *
     * @param taskId the task ID
     * @param labelId the label ID
     * @throws ResourceNotFoundException if the task or label doesn't exist
     */
    @Transactional
    public void removeLabelFromTask(@NonNull UUID taskId, @NonNull UUID labelId) {
        Task task =
                taskRepository
                        .findById(taskId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Task not found: " + taskId));

        Label label =
                labelRepository
                        .findById(labelId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Label not found: " + labelId));

        task.getLabels().remove(label);
        taskRepository.save(task);

        Board board = task.getBoard();
        board.setDateModified(Instant.now());
        boardRepository.save(board);

        eventPublisher.publish("TASK_UPDATED", board.getId(), taskId);
    }
}
