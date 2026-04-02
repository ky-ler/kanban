CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_id VARCHAR(255) NOT NULL REFERENCES users(id),
    actor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    reference_id UUID,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, date_created DESC);
