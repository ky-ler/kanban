package com.kylerriggs.kanban.notification;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class to extract mentioned user IDs from content. Parses the Lexical rich-text mention
 * format: [@Display Name](userId) or @[Display Name](userId)
 */
public final class MentionParser {

    // Matches both [@name](userId) and @[name](userId) formats
    private static final Pattern MENTION_PATTERN =
            Pattern.compile("(?:@\\[|\\[@)([^\\]]+)\\]\\(([^)]+)\\)");

    private MentionParser() {
        // Utility class - prevent instantiation
    }

    /**
     * Extracts all mentioned user IDs from the given content.
     *
     * @param content the text content that may contain mentions
     * @return a set of user IDs that were mentioned, empty set if none found or content is
     *     null/blank
     */
    public static Set<String> extractMentionedUserIds(String content) {
        if (content == null || content.isBlank()) {
            return Set.of();
        }

        Set<String> userIds = new HashSet<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            String userId = matcher.group(2);
            if (userId != null && !userId.isBlank()) {
                userIds.add(userId);
            }
        }
        return userIds;
    }
}
