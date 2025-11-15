package com.kylerriggs.kanban.board;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BoardUserId implements Serializable {
    private UUID board;
    private String user;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BoardUserId that)) return false;
        return Objects.equals(board, that.board) && Objects.equals(user, that.user);
    }

    @Override
    public int hashCode() {
        return Objects.hash(board, user);
    }
}
