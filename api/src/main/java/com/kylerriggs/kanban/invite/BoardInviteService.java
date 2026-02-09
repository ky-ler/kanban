package com.kylerriggs.kanban.invite;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardRole;
import com.kylerriggs.kanban.board.BoardUser;
import com.kylerriggs.kanban.board.BoardUserRepository;
import com.kylerriggs.kanban.config.BoardProperties;
import com.kylerriggs.kanban.exception.BadRequestException;
import com.kylerriggs.kanban.exception.BoardLimitExceededException;
import com.kylerriggs.kanban.exception.ResourceNotFoundException;
import com.kylerriggs.kanban.invite.dto.AcceptInviteResponse;
import com.kylerriggs.kanban.invite.dto.BoardInviteDto;
import com.kylerriggs.kanban.invite.dto.CreateInviteRequest;
import com.kylerriggs.kanban.invite.dto.InvitePreviewDto;
import com.kylerriggs.kanban.user.User;
import com.kylerriggs.kanban.user.UserRepository;
import com.kylerriggs.kanban.user.UserService;

import lombok.RequiredArgsConstructor;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardInviteService {
    private final BoardInviteRepository inviteRepository;
    private final BoardRepository boardRepository;
    private final BoardUserRepository boardUserRepository;
    private final UserRepository userRepository;
    private final BoardInviteMapper inviteMapper;
    private final UserService userService;
    private final BoardProperties boardProperties;

    private static final String CODE_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int CODE_LENGTH = 12;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public BoardInviteDto createInvite(CreateInviteRequest request) {
        String userId = userService.getCurrentUserId();

        User creator =
                userRepository
                        .findById(userId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("User not found: " + userId));

        Board board =
                boardRepository
                        .findById(request.boardId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Board not found: " + request.boardId()));

        Instant expiresAt =
                request.expiration().getDuration() != null
                        ? Instant.now().plus(request.expiration().getDuration())
                        : null;

        BoardInvite invite =
                BoardInvite.builder()
                        .code(generateUniqueCode())
                        .board(board)
                        .createdBy(creator)
                        .expiresAt(expiresAt)
                        .maxUses(request.maxUses().getUses())
                        .build();

        if (invite == null) {
            throw new BadRequestException("Failed to create invite");
        }

        return inviteMapper.toDto(inviteRepository.save(invite));
    }

    @Transactional(readOnly = true)
    public List<BoardInviteDto> getInvitesForBoard(@NonNull UUID boardId) {
        return inviteRepository.findActiveByBoardId(boardId).stream()
                .map(inviteMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public InvitePreviewDto getInvitePreview(@NonNull String code) {
        BoardInvite invite =
                inviteRepository
                        .findByCodeWithBoard(code)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Invite not found: " + code));
        return inviteMapper.toPreviewDto(invite);
    }

    @Transactional
    public AcceptInviteResponse acceptInvite(@NonNull String code) {
        String userId = userService.getCurrentUserId();

        BoardInvite invite =
                inviteRepository
                        .findByCodeWithBoardForUpdate(code)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("Invite not found: " + code));

        // Validate invite
        if (invite.isRevoked()) {
            throw new BadRequestException("Invite has been revoked");
        }
        if (invite.getExpiresAt() != null && Instant.now().isAfter(invite.getExpiresAt())) {
            throw new BadRequestException("Invite has expired");
        }
        if (invite.getMaxUses() != null && invite.getUseCount() >= invite.getMaxUses()) {
            throw new BadRequestException("Invite has reached maximum uses");
        }

        Board board = invite.getBoard();

        // Check if already a member
        if (boardUserRepository.existsByBoardIdAndUserId(board.getId(), userId)) {
            return new AcceptInviteResponse(board.getId(), board.getName(), true);
        }

        // Check board limit
        long userBoardCount = boardRepository.countByCollaboratorsUserId(userId);
        if (userBoardCount >= boardProperties.getMaxBoardsPerUser()) {
            throw new BoardLimitExceededException(
                    "You have reached the maximum limit of "
                            + boardProperties.getMaxBoardsPerUser()
                            + " boards");
        }

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("User not found: " + userId));

        // Add user as MEMBER
        BoardUser membership =
                BoardUser.builder().board(board).user(user).role(BoardRole.MEMBER).build();
        board.getCollaborators().add(membership);

        // Increment use count
        invite.setUseCount(invite.getUseCount() + 1);
        inviteRepository.save(invite);
        boardRepository.save(board);

        return new AcceptInviteResponse(board.getId(), board.getName(), false);
    }

    @Transactional
    public void revokeInvite(@NonNull UUID inviteId) {
        BoardInvite invite =
                inviteRepository
                        .findById(inviteId)
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "Invite not found: " + inviteId));
        invite.setRevoked(true);
        inviteRepository.save(invite);
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = generateCode();
        } while (inviteRepository.findByCode(code).isPresent());
        return code;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(secureRandom.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
