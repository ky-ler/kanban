package com.kylerriggs.velora.board;

import com.kylerriggs.velora.config.BoardProperties;
import com.kylerriggs.velora.exception.BoardLimitExceededException;

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
