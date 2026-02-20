package com.kylerriggs.kanban.activity;

public enum ActivityType {
    TASK_CREATED,
    TASK_UPDATED,
    TASK_MOVED,
    TASK_DELETED,
    TASK_COMPLETED,
    TASK_REOPENED,
    TASK_ARCHIVED,
    TASK_UNARCHIVED,
    ASSIGNEE_CHANGED,
    LABELS_CHANGED,
    PRIORITY_CHANGED,
    DUE_DATE_CHANGED
}
