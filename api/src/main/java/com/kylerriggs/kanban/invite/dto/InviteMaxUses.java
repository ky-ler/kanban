package com.kylerriggs.kanban.invite.dto;

public enum InviteMaxUses {
    ONE(1),
    FIVE(5),
    TEN(10),
    TWENTY_FIVE(25),
    UNLIMITED(null);

    private final Integer uses;

    InviteMaxUses(Integer uses) {
        this.uses = uses;
    }

    public Integer getUses() {
        return uses;
    }
}
