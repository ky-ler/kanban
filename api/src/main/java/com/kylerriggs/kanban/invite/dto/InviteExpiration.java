package com.kylerriggs.kanban.invite.dto;

import java.time.Duration;

public enum InviteExpiration {
    ONE_DAY(Duration.ofDays(1)),
    SEVEN_DAYS(Duration.ofDays(7)),
    THIRTY_DAYS(Duration.ofDays(30)),
    NEVER(null);

    private final Duration duration;

    InviteExpiration(Duration duration) {
        this.duration = duration;
    }

    public Duration getDuration() {
        return duration;
    }
}
