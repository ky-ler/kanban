package com.kylerriggs.kanban.label;

import com.kylerriggs.kanban.board.BoardAccess;
import com.kylerriggs.kanban.common.BaseAccess;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component("labelAccess")
@AllArgsConstructor
@Slf4j
public class LabelAccess extends BaseAccess {
    private final LabelRepository labelRepository;
    private final BoardAccess boardAccess;

    /**
     * Checks if the current user is a collaborator on the board that owns the label.
     *
     * @param labelId the ID of the label to check
     * @return true if the user is a collaborator on the label's board
     * @throws ResourceNotFoundException if the label doesn't exist
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public boolean isCollaborator(UUID labelId) {
        Label label =
                labelRepository
                        .findByIdWithBoard(labelId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Label not found: " + labelId));
        return boardAccess.isCollaborator(label.getBoard().getId());
    }
}
