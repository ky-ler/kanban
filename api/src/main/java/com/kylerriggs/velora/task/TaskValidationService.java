package com.kylerriggs.velora.task;

import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.column.Column;
import com.kylerriggs.velora.column.ColumnRepository;
import com.kylerriggs.velora.exception.BadRequestException;
import com.kylerriggs.velora.exception.BoardAccessException;
import com.kylerriggs.velora.exception.ResourceNotFoundException;
import com.kylerriggs.velora.label.Label;
import com.kylerriggs.velora.label.LabelRepository;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserLookupService;

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

    /** Validates and returns an active column that belongs to the given board. */
    public Column validateActiveColumnInBoard(UUID columnId, UUID boardId) {
        Column column = validateColumnInBoard(columnId, boardId);
        if (column.isArchived()) {
            throw new BadRequestException("Column is archived. Unarchive it before using it.");
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
