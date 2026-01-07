package com.kylerriggs.kanban.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.kylerriggs.kanban.board.Board;
import com.kylerriggs.kanban.config.SecurityProperties;
import com.kylerriggs.kanban.user.dto.UserDto;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class UserMapperTest {

    private static final String CLAIM_PREFIX = "https://kanban.example.com/claims/";
    private static final String USER_ID = "auth0|user123";
    private static final String USERNAME = "testuser";
    private static final String EMAIL = "test@example.com";
    private static final String PROFILE_IMAGE_URL = "https://example.com/avatar.jpg";

    @Mock private SecurityProperties securityProperties;
    @Mock private Jwt jwt;

    private UserMapper userMapper;

    @BeforeEach
    void setUp() {
        userMapper = new UserMapper(securityProperties);
    }

    private void setupClaimPrefix() {
        when(securityProperties.getCustomClaimPrefix()).thenReturn(CLAIM_PREFIX);
    }

    @Nested
    class MapUserFromToken {

        @Test
        void mapUserFromToken_ShouldMapAllFields() {
            // Given
            setupClaimPrefix();
            when(jwt.getClaimAsString("sub")).thenReturn(USER_ID);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "username")).thenReturn(USERNAME);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "email")).thenReturn(EMAIL);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "picture")).thenReturn(PROFILE_IMAGE_URL);

            // When
            User result = userMapper.mapUserFromToken(jwt);

            // Then
            assertEquals(USER_ID, result.getId());
            assertEquals(USERNAME, result.getUsername());
            assertEquals(EMAIL, result.getEmail());
            assertEquals(PROFILE_IMAGE_URL, result.getProfileImageUrl());
        }

        @Test
        void mapUserFromToken_WhenClaimsAreNull_ShouldMapNullValues() {
            // Given
            setupClaimPrefix();
            when(jwt.getClaimAsString("sub")).thenReturn(USER_ID);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "username")).thenReturn(null);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "email")).thenReturn(null);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "picture")).thenReturn(null);

            // When
            User result = userMapper.mapUserFromToken(jwt);

            // Then
            assertEquals(USER_ID, result.getId());
            assertNull(result.getUsername());
            assertNull(result.getEmail());
            assertNull(result.getProfileImageUrl());
        }
    }

    @Nested
    class UpdateUserFromToken {

        @Test
        void updateUserFromToken_WhenFieldsChanged_ShouldUpdate() {
            // Given
            setupClaimPrefix();
            User user = new User();
            user.setId(USER_ID);
            user.setUsername("oldUsername");
            user.setEmail("old@example.com");
            user.setProfileImageUrl("https://old.com/avatar.jpg");

            when(jwt.getClaimAsString(CLAIM_PREFIX + "username")).thenReturn(USERNAME);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "email")).thenReturn(EMAIL);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "picture")).thenReturn(PROFILE_IMAGE_URL);

            // When
            userMapper.updateUserFromToken(user, jwt);

            // Then
            assertEquals(USERNAME, user.getUsername());
            assertEquals(EMAIL, user.getEmail());
            assertEquals(PROFILE_IMAGE_URL, user.getProfileImageUrl());
        }

        @Test
        void updateUserFromToken_WhenFieldsUnchanged_ShouldNotUpdate() {
            // Given
            setupClaimPrefix();
            User user = new User();
            user.setId(USER_ID);
            user.setUsername(USERNAME);
            user.setEmail(EMAIL);
            user.setProfileImageUrl(PROFILE_IMAGE_URL);

            when(jwt.getClaimAsString(CLAIM_PREFIX + "username")).thenReturn(USERNAME);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "email")).thenReturn(EMAIL);
            when(jwt.getClaimAsString(CLAIM_PREFIX + "picture")).thenReturn(PROFILE_IMAGE_URL);

            // When
            userMapper.updateUserFromToken(user, jwt);

            // Then - values should remain the same
            assertEquals(USERNAME, user.getUsername());
            assertEquals(EMAIL, user.getEmail());
            assertEquals(PROFILE_IMAGE_URL, user.getProfileImageUrl());
        }

        @Test
        void updateUserFromToken_WhenClaimsAreBlank_ShouldNotUpdate() {
            // Given
            setupClaimPrefix();
            User user = new User();
            user.setId(USER_ID);
            user.setUsername(USERNAME);
            user.setEmail(EMAIL);
            user.setProfileImageUrl(PROFILE_IMAGE_URL);

            when(jwt.getClaimAsString(CLAIM_PREFIX + "username")).thenReturn("");
            when(jwt.getClaimAsString(CLAIM_PREFIX + "email")).thenReturn("");
            when(jwt.getClaimAsString(CLAIM_PREFIX + "picture")).thenReturn("");

            // When
            userMapper.updateUserFromToken(user, jwt);

            // Then - original values should be preserved
            assertEquals(USERNAME, user.getUsername());
            assertEquals(EMAIL, user.getEmail());
            assertEquals(PROFILE_IMAGE_URL, user.getProfileImageUrl());
        }
    }

    @Nested
    class ToSummaryDto {

        @Test
        void toSummaryDto_ShouldMapCorrectly() {
            // Given
            User user = new User();
            user.setId(USER_ID);
            user.setUsername(USERNAME);
            user.setProfileImageUrl(PROFILE_IMAGE_URL);

            // When
            UserSummaryDto result = userMapper.toSummaryDto(user);

            // Then
            assertEquals(USER_ID, result.id());
            assertEquals(USERNAME, result.username());
            assertEquals(PROFILE_IMAGE_URL, result.profileImageUrl());
        }
    }

    @Nested
    class ToUserDto {

        @Test
        void toUserDto_WithDefaultBoard_ShouldIncludeBoardId() {
            // Given
            User user = new User();
            user.setId(USER_ID);
            user.setUsername(USERNAME);
            user.setEmail(EMAIL);
            user.setProfileImageUrl(PROFILE_IMAGE_URL);

            Board board = new Board();
            UUID boardId = UUID.randomUUID();
            board.setId(boardId);
            user.setDefaultBoard(board);

            // When
            UserDto result = userMapper.toUserDto(user);

            // Then
            assertEquals(USER_ID, result.id());
            assertEquals(USERNAME, result.username());
            assertEquals(EMAIL, result.email());
            assertEquals(PROFILE_IMAGE_URL, result.profileImageUrl());
            assertEquals(boardId.toString(), result.defaultBoardId());
        }

        @Test
        void toUserDto_WithoutDefaultBoard_ShouldHaveNullBoardId() {
            // Given
            User user = new User();
            user.setId(USER_ID);
            user.setUsername(USERNAME);
            user.setEmail(EMAIL);
            user.setProfileImageUrl(PROFILE_IMAGE_URL);
            user.setDefaultBoard(null);

            // When
            UserDto result = userMapper.toUserDto(user);

            // Then
            assertEquals(USER_ID, result.id());
            assertNull(result.defaultBoardId());
        }
    }

    @Nested
    class ToEntity {

        @Test
        void toEntity_ShouldCreateUserWithFields() {
            // When
            User result = userMapper.toEntity(EMAIL, USERNAME, PROFILE_IMAGE_URL);

            // Then
            assertEquals(EMAIL, result.getEmail());
            assertEquals(USERNAME, result.getUsername());
            assertEquals(PROFILE_IMAGE_URL, result.getProfileImageUrl());
            assertNull(result.getId());
        }
    }
}
