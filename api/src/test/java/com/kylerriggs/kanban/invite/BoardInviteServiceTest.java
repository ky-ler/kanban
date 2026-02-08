package com.kylerriggs.kanban.invite;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardUserRepository;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.invite.dto.AcceptInviteResponse;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class BoardInviteServiceTest {
    private static final String USER_ID = "auth0|user123";
    private static final String INVITE_CODE = "ABC123XYZ789";
    private static final UUID BOARD_ID = UUID.fromString("a156c2d0-891b-44de-816b-c9259cd00391");

    @Mock private BoardInviteRepository inviteRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private BoardUserRepository boardUserRepository;
    @Mock private UserRepository userRepository;
    @Mock private BoardInviteMapper inviteMapper;
    @Mock private UserService userService;
    @Mock private BoardProperties boardProperties;

    @InjectMocks private BoardInviteService boardInviteService;

    @Test
    void acceptInvite_WhenAlreadyMember_UsesLockedInviteLookup() {
        Board board = Board.builder().id(BOARD_ID).name("Team Board").build();
        BoardInvite invite =
                BoardInvite.builder()
                        .code(INVITE_CODE)
                        .board(board)
                        .maxUses(5)
                        .useCount(1)
                        .revoked(false)
                        .build();

        when(userService.getCurrentUserId()).thenReturn(USER_ID);
        when(inviteRepository.findByCodeWithBoardForUpdate(INVITE_CODE))
                .thenReturn(Optional.of(invite));
        when(boardUserRepository.existsByBoardIdAndUserId(BOARD_ID, USER_ID)).thenReturn(true);

        AcceptInviteResponse response = boardInviteService.acceptInvite(INVITE_CODE);

        assertTrue(response.alreadyMember());
        verify(inviteRepository).findByCodeWithBoardForUpdate(INVITE_CODE);
        verify(inviteRepository, never()).findByCodeWithBoard(any());
    }

    @Test
    void acceptInvite_WhenMaxUsesReached_ThrowsBadRequestException() {
        Board board = Board.builder().id(BOARD_ID).name("Team Board").build();
        BoardInvite invite =
                BoardInvite.builder()
                        .code(INVITE_CODE)
                        .board(board)
                        .maxUses(1)
                        .useCount(1)
                        .revoked(false)
                        .build();

        when(userService.getCurrentUserId()).thenReturn(USER_ID);
        when(inviteRepository.findByCodeWithBoardForUpdate(INVITE_CODE))
                .thenReturn(Optional.of(invite));

        assertThrows(BadRequestException.class, () -> boardInviteService.acceptInvite(INVITE_CODE));

        verify(inviteRepository, never()).save(any());
        verify(boardRepository, never()).save(any());
    }
}
