package com.kylerriggs.kanban.comment;

import com.kylerriggs.kanban.common.BaseEntity;
import com.kylerriggs.kanban.task.Task;
import com.kylerriggs.kanban.user.User;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(
        name = "comments",
        indexes = {@Index(name = "idx_comments_task_id", columnList = "task_id")})
public class Comment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @ManyToOne(optional = false)
    @JoinColumn(name = "task_id", foreignKey = @ForeignKey(name = "fk_comment_task"))
    private Task task;

    @ManyToOne(optional = false)
    @JoinColumn(name = "author_id", foreignKey = @ForeignKey(name = "fk_comment_author"))
    private User author;
}
