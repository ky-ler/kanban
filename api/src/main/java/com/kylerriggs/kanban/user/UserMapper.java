package com.kylerriggs.kanban.user;

import com.kylerriggs.kanban.user.dto.UserDto;
import com.kylerriggs.kanban.user.dto.UserSummaryDto;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class UserMapper {
    private static final String AUTH0_ACTION_CLAIMS_NAMESPACE = "https://kanban.kylerriggs.com/claims/";

    /**
     * Creates a new User entity from JWT token claims.
     * Extracts user information from Auth0 custom claims.
     *
     * @param jwt the JWT token containing user claims
     * @return a new User entity with data from the token
     */
    public User mapUserFromToken(Jwt jwt) {
        User user = new User();

        user.setId(jwt.getClaimAsString("sub"));

        String username = jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "username");

        if (username == null) {
            username = jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "nickname");
        }

        user.setUsername(username);

        user.setEmail(jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "email"));

        user.setProfileImageUrl(jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "picture"));

        return user;
    }

    /**
     * Updates an existing User entity with fresh data from JWT token claims.
     * Only updates fields that have changed to avoid unnecessary database writes.
     *
     * @param user the user entity to update
     * @param jwt  the JWT token containing updated user claims
     */
    public void updateUserFromToken(User user, Jwt jwt) {
        String username = jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "nickname");
        if (StringUtils.hasText(username) && !username.equals(user.getUsername())) {
            user.setUsername(username);
        }

        String email = jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "email");
        if (StringUtils.hasText(email) && !email.equals(user.getEmail())) {
            user.setEmail(email);
        }

        String profileImageUrl = jwt.getClaimAsString(AUTH0_ACTION_CLAIMS_NAMESPACE + "picture");
        if (StringUtils.hasText(profileImageUrl) && !profileImageUrl.equals(user.getProfileImageUrl())) {
            user.setProfileImageUrl(profileImageUrl);
        }
    }

    /**
     * Converts a User entity to a summary DTO with basic information.
     * Used for displaying user information without sensitive data like email.
     *
     * @param user the user entity to convert
     * @return the user as a summary DTO
     */
    public UserSummaryDto toSummaryDto(User user) {
        return new UserSummaryDto(
                user.getId(),
                user.getUsername(),
                user.getProfileImageUrl()
        );
    }

    /**
     * Converts a User entity to a detailed DTO including email and default board.
     * Used for user profile endpoints where full information is needed.
     *
     * @param user the user entity to convert
     * @return the user as a detailed DTO
     */
    public UserDto toUserDto(User user) {
        String defaultBoardId = user.getDefaultBoard() != null ? user.getDefaultBoard().getId().toString() : null;
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProfileImageUrl(),
                defaultBoardId
        );
    }

    /**
     * Creates a new User entity from basic information.
     *
     * @param email           the user's email address
     * @param username        the user's username
     * @param profileImageUrl the URL of the user's profile image
     * @return a new User entity
     */
    public User toEntity(String email, String username, String profileImageUrl) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setProfileImageUrl(profileImageUrl);
        return user;
    }
}
