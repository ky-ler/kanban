package com.kylerriggs.kanban.column;

import com.kylerriggs.kanban.board.BoardAccess;
import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Component("columnAccess")
@AllArgsConstructor
@Slf4j
public class ColumnAccess extends BaseAccess {
    private final ColumnRepository columnRepository;
    private final BoardAccess boardAccess;

    /**
     * Checks if the current user is a collaborator on the board containing this column.
     *
     * @param columnId the ID of the column
     * @return true if the user is a collaborator
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isCollaborator(@NonNull UUID columnId) {
        Column column =
                columnRepository
                        .findById(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));
        return boardAccess.isCollaborator(Objects.requireNonNull(column.getBoard().getId()));
    }

    /**
     * Checks if the current user is an admin on the board containing this column.
     *
     * @param columnId the ID of the column
     * @return true if the user is an admin
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isAdmin(@NonNull UUID columnId) {
        Column column =
                columnRepository
                        .findById(columnId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Column not found: " + columnId));
        return boardAccess.isAdmin(Objects.requireNonNull(column.getBoard().getId()));
    }
}
