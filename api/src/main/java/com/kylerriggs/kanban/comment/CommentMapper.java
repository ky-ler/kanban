package com.kylerriggs.kanban.comment;

import com.kylerriggs.kanban.comment.dto.CommentDto;
import com.kylerriggs.kanban.user.UserMapper;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommentMapper {
    private final UserMapper userMapper;

    public CommentDto toDto(Comment comment) {
        UserSummaryDto author = userMapper.toSummaryDto(comment.getAuthor());

        return new CommentDto(
                comment.getId(),
                comment.getContent(),
                author,
                comment.getTask().getId(),
                comment.getDateCreated() != null ? comment.getDateCreated().toString() : null,
                comment.getDateModified() != null ? comment.getDateModified().toString() : null);
    }
}
