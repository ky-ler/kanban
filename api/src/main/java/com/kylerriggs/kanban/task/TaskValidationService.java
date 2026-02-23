package com.kylerriggs.kanban.task;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.column.Column;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardAccessException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.label.Label;
import com.kylerriggs.kanban.label.LabelRepository;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserLookupService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskValidationService {
    private final ColumnRepository columnRepository;
    private final LabelRepository labelRepository;
    private final UserLookupService userLookupService;

    /** Validates and returns a column that belongs to the given board. */
    public Column validateColumnInBoard(UUID columnId, UUID boardId) {
        Column column =
                columnRepository
                        .findById(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));

        if (!column.getBoard().getId().equals(boardId)) {
            throw new BadRequestException("Column does not belong to this board");
        }

        return column;
    }

    /** Validates that the assignee is a collaborator on the board and returns the User. */
    public User validateAssigneeInBoard(String assigneeId, Board board) {
        board.getCollaborators().stream()
                .filter(c -> c.getUser().getId().equals(assigneeId))
                .findFirst()
                .orElseThrow(
                        () ->
                                new BoardAccessException(
                                        "User is not a collaborator on the board: " + assigneeId));

        return userLookupService.getRequiredUser(assigneeId);
    }

    /** Validates that all label IDs belong to the board and returns the label set. */
    public Set<Label> validateLabelsInBoard(List<UUID> labelIds, UUID boardId) {
        Set<Label> labels = new LinkedHashSet<>();
        for (UUID labelId : labelIds) {
            Label label =
                    labelRepository
                            .findByIdAndBoardId(labelId, boardId)
                            .orElseThrow(
                                    () ->
                                            new BadRequestException(
                                                    "Label not found or doesn't belong to this"
                                                            + " board: "
                                                            + labelId));
            labels.add(label);
        }
        return labels;
    }
}
