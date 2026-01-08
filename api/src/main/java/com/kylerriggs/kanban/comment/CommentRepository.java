package com.kylerriggs.kanban.comment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByTaskIdOrderByDateCreatedAsc(UUID taskId);

    void deleteByTaskId(UUID taskId);
}
