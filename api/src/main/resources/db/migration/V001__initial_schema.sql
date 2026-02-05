CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_image_url VARCHAR(255) NOT NULL,
    default_board_id UUID,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE boards (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_id VARCHAR(255) NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_board_creator FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE columns (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    board_id UUID NOT NULL,
    CONSTRAINT fk_column_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(10),
    due_date DATE,
    board_id UUID NOT NULL,
    created_by_id VARCHAR(255) NOT NULL,
    assigned_to_id VARCHAR(255),
    column_id UUID NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_task_board FOREIGN KEY (board_id) REFERENCES boards(id),
    CONSTRAINT fk_task_creator FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT fk_task_assignee FOREIGN KEY (assigned_to_id) REFERENCES users(id),
    CONSTRAINT fk_task_column FOREIGN KEY (column_id) REFERENCES columns(id),
    CONSTRAINT uk_task_column_position UNIQUE (column_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE labels (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    board_id UUID NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_label_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE task_labels (
    task_id UUID NOT NULL,
    label_id UUID NOT NULL,
    PRIMARY KEY (task_id, label_id),
    CONSTRAINT fk_task_labels_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_labels_label FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE TABLE board_users (
    board_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (board_id, user_id),
    CONSTRAINT fk_pu_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_pu_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    details TEXT,
    task_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_activity_log_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_log_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_activity_logs_task_id ON activity_logs(task_id);

CREATE TABLE comments (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    task_id UUID NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_comment_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_comments_task_id ON comments(task_id);

CREATE TABLE board_invites (
    id UUID PRIMARY KEY,
    code VARCHAR(12) NOT NULL,
    board_id UUID NOT NULL,
    created_by_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP,
    max_uses INTEGER,
    use_count INTEGER NOT NULL DEFAULT 0,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_board_invites_code UNIQUE (code),
    CONSTRAINT fk_invite_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_creator FOREIGN KEY (created_by_id) REFERENCES users(id)
);

ALTER TABLE users
    ADD CONSTRAINT fk_user_default_board FOREIGN KEY (default_board_id) REFERENCES boards(id) ON DELETE SET NULL;
