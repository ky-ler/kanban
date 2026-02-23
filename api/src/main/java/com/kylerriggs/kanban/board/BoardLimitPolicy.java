package com.kylerriggs.kanban.board;

import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BoardLimitExceededException;

import org.springframework.stereotype.Service;

@Service
public class BoardLimitPolicy {
    private final BoardRepository boardRepository;
    private final BoardProperties boardProperties;

    public BoardLimitPolicy(BoardRepository boardRepository, BoardProperties boardProperties) {
        this.boardRepository = boardRepository;
        this.boardProperties = boardProperties;
    }

    public void assertCanCreateOrCollaborate(String userId) {
        long userBoardCount = boardRepository.countByCollaboratorsUserId(userId);
        if (userBoardCount >= boardProperties.getMaxBoardsPerUser()) {
            throw new BoardLimitExceededException(
                    "User has reached the maximum limit of "
                            + boardProperties.getMaxBoardsPerUser()
                            + " boards");
        }
    }

    public void assertCanAcceptInvite(String userId) {
        long userBoardCount = boardRepository.countByCollaboratorsUserId(userId);
        if (userBoardCount >= boardProperties.getMaxBoardsPerUser()) {
            throw new BoardLimitExceededException(
                    "You have reached the maximum limit of "
                            + boardProperties.getMaxBoardsPerUser()
                            + " boards");
        }
    }
}
