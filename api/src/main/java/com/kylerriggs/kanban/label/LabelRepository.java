package com.kylerriggs.kanban.label;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LabelRepository extends JpaRepository<Label, UUID> {

    /**
     * Finds all labels belonging to a specific board.
     *
     * @param boardId the board ID
     * @return list of labels for the board
     */
    List<Label> findByBoardId(UUID boardId);

    /**
     * Finds a label by ID with its board eagerly loaded.
     *
     * @param labelId the label ID
     * @return the label with board loaded
     */
    @Query("SELECT l FROM Label l LEFT JOIN FETCH l.board WHERE l.id = :labelId")
    Optional<Label> findByIdWithBoard(@Param("labelId") UUID labelId);

    /**
     * Finds a label by ID and board ID for authorization.
     *
     * @param labelId the label ID
     * @param boardId the board ID
     * @return the label if it belongs to the specified board
     */
    Optional<Label> findByIdAndBoardId(UUID labelId, UUID boardId);
}
