package com.kylerriggs.kanban.label;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.label.dto.LabelDto;
import com.kylerriggs.kanban.label.dto.LabelRequest;
import com.kylerriggs.kanban.label.dto.LabelSummaryDto;

import org.springframework.stereotype.Service;

@Service
public class LabelMapper {

    /**
     * Converts a Label entity to a detailed DTO.
     *
     * @param label the label entity to convert
     * @return the label as a detailed DTO
     */
    public LabelDto toDto(Label label) {
        return new LabelDto(
                label.getId(),
                label.getName(),
                label.getColor(),
                label.getBoard().getId(),
                label.getDateCreated() != null ? label.getDateCreated().toString() : null,
                label.getDateModified() != null ? label.getDateModified().toString() : null);
    }

    /**
     * Converts a Label entity to a summary DTO for embedding in other DTOs.
     *
     * @param label the label entity to convert
     * @return the label as a summary DTO
     */
    public LabelSummaryDto toSummaryDto(Label label) {
        return new LabelSummaryDto(label.getId(), label.getName(), label.getColor());
    }

    /**
     * Converts a label creation request to a Label entity.
     *
     * @param request the label creation request
     * @param board the board the label belongs to
     * @return the new label entity
     */
    public Label toEntity(LabelRequest request, Board board) {
        return Label.builder().name(request.name()).color(request.color()).board(board).build();
    }
}
