package com.kylerriggs.velora.invite;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kylerriggs.velora.board.Board;
import com.kylerriggs.velora.board.BoardRepository;
import com.kylerriggs.velora.board.BoardRole;
import com.kylerriggs.velora.board.BoardUser;
import com.kylerriggs.velora.board.BoardUserRepository;
import com.kylerriggs.velora.exception.BadRequestException;
import com.kylerriggs.velora.invite.dto.AcceptInviteResponse;
import com.kylerriggs.velora.invite.dto.CreateInviteRequest;
import com.kylerriggs.velora.invite.dto.InviteExpiration;
import com.kylerriggs.velora.invite.dto.InviteMaxUses;
import com.kylerriggs.velora.invite.dto.InvitePreviewDto;
import com.kylerriggs.velora.support.PostgresIntegrationTestBase;
import com.kylerriggs.velora.user.User;
import com.kylerriggs.velora.user.UserRepository;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class BoardInviteServiceIT extends PostgresIntegrationTestBase {

    @Autowired private BoardInviteService boardInviteService;
    @Autowired private BoardInviteRepository boardInviteRepository;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardUserRepository boardUserRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JwtDecoder jwtDecoder;

    private User owner;
    private User invitee;
    private Board board;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();

        owner =
                userRepository.save(
                        User.builder()
                                .id("auth0|invite-owner")
                                .username("invite-owner")
                                .email("invite-owner@example.com")
                                .profileImageUrl("https://example.com/invite-owner.png")
                                .build());
        invitee =
                userRepository.save(
                        User.builder()
                                .id("auth0|invite-invitee")
                                .username("invite-invitee")
                                .email("invite-invitee@example.com")
                                .profileImageUrl("https://example.com/invite-invitee.png")
                                .build());

        board =
                boardRepository.save(
                        Board.builder()
                                .name("Invite Service IT Board")
                                .description("invite board")
                                .createdBy(owner)
                                .build());
        boardUserRepository.save(
                BoardUser.builder().board(board).user(owner).role(BoardRole.ADMIN).build());
    }

    @Test
    void createInvite_andGetPreview_returnsValidInvite() {
        withAuthenticatedUser(owner.getId());

        var inviteDto =
                boardInviteService.createInvite(
                        new CreateInviteRequest(
                                board.getId(), InviteExpiration.SEVEN_DAYS, InviteMaxUses.FIVE));

        entityManager.flush();
        entityManager.clear();

        BoardInvite persistedInvite =
                boardInviteRepository
                        .findById(inviteDto.id())
                        .orElseThrow(() -> new AssertionError("Expected invite"));
        InvitePreviewDto preview = boardInviteService.getInvitePreview(inviteDto.code());

        assertThat(persistedInvite.getCode()).hasSize(12);
        assertThat(persistedInvite.getBoard().getId()).isEqualTo(board.getId());
        assertThat(persistedInvite.getCreatedBy().getId()).isEqualTo(owner.getId());
        assertThat(preview.valid()).isTrue();
        assertThat(preview.boardName()).isEqualTo(board.getName());
        assertThat(preview.errorMessage()).isNull();
    }

    @Test
    void acceptInvite_addsMembershipAndIncrementsUseCount() {
        withAuthenticatedUser(owner.getId());
        String code =
                boardInviteService
                        .createInvite(
                                new CreateInviteRequest(
                                        board.getId(), InviteExpiration.NEVER, InviteMaxUses.TEN))
                        .code();
        withAuthenticatedUser(invitee.getId());

        AcceptInviteResponse response = boardInviteService.acceptInvite(code);
        entityManager.flush();
        entityManager.clear();

        BoardInvite invite =
                boardInviteRepository
                        .findByCode(code)
                        .orElseThrow(() -> new AssertionError("Expected invite by code"));

        assertThat(response.alreadyMember()).isFalse();
        assertThat(response.boardId()).isEqualTo(board.getId());
        assertThat(boardUserRepository.existsByBoardIdAndUserId(board.getId(), invitee.getId()))
                .isTrue();
        assertThat(invite.getUseCount()).isEqualTo(1);
    }

    @Test
    void acceptInvite_whenAlreadyMember_returnsAlreadyMemberTrueWithoutIncrement() {
        boardUserRepository.save(
                BoardUser.builder().board(board).user(invitee).role(BoardRole.MEMBER).build());
        withAuthenticatedUser(owner.getId());
        String code =
                boardInviteService
                        .createInvite(
                                new CreateInviteRequest(
                                        board.getId(), InviteExpiration.NEVER, InviteMaxUses.TEN))
                        .code();
        withAuthenticatedUser(invitee.getId());

        AcceptInviteResponse response = boardInviteService.acceptInvite(code);
        entityManager.flush();
        entityManager.clear();

        BoardInvite invite =
                boardInviteRepository
                        .findByCode(code)
                        .orElseThrow(() -> new AssertionError("Expected invite by code"));
        assertThat(response.alreadyMember()).isTrue();
        assertThat(invite.getUseCount()).isZero();
    }

    @Test
    void acceptInvite_rejectsRevokedExpiredAndMaxUsedInvites() {
        withAuthenticatedUser(owner.getId());
        String code =
                boardInviteService
                        .createInvite(
                                new CreateInviteRequest(
                                        board.getId(), InviteExpiration.NEVER, InviteMaxUses.ONE))
                        .code();

        BoardInvite invite =
                boardInviteRepository
                        .findByCode(code)
                        .orElseThrow(() -> new AssertionError("Expected invite"));

        invite.setRevoked(true);
        boardInviteRepository.save(invite);
        withAuthenticatedUser(invitee.getId());
        assertThatThrownBy(() -> boardInviteService.acceptInvite(code))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("revoked");

        invite.setRevoked(false);
        invite.setExpiresAt(Instant.now().minusSeconds(60));
        boardInviteRepository.save(invite);
        assertThatThrownBy(() -> boardInviteService.acceptInvite(code))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("expired");

        invite.setExpiresAt(Instant.now().plusSeconds(60));
        invite.setMaxUses(1);
        invite.setUseCount(1);
        boardInviteRepository.save(invite);
        assertThatThrownBy(() -> boardInviteService.acceptInvite(code))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("maximum uses");
    }

    @Test
    void revokeInvite_marksInviteAsRevoked_andExcludesFromActiveList() {
        withAuthenticatedUser(owner.getId());
        UUID inviteId =
                boardInviteService
                        .createInvite(
                                new CreateInviteRequest(
                                        board.getId(),
                                        InviteExpiration.THIRTY_DAYS,
                                        InviteMaxUses.TWENTY_FIVE))
                        .id();
        entityManager.flush();
        entityManager.clear();

        boardInviteService.revokeInvite(inviteId);
        entityManager.flush();
        entityManager.clear();

        BoardInvite invite =
                boardInviteRepository
                        .findById(inviteId)
                        .orElseThrow(() -> new AssertionError("Expected invite"));
        var activeInvites = boardInviteService.getInvitesForBoard(board.getId());

        assertThat(invite.isRevoked()).isTrue();
        assertThat(activeInvites).extracting("id").doesNotContain(inviteId);
    }

    private void withAuthenticatedUser(String userId) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new org.springframework.security.authentication
                                .UsernamePasswordAuthenticationToken(userId, "n/a", List.of()));
    }
}
