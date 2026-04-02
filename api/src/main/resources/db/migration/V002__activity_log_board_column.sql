-- Add board_id to activity_logs for direct board association
ALTER TABLE activity_logs ADD COLUMN board_id UUID;

-- Backfill board_id from the task's board for existing rows
UPDATE activity_logs al
SET board_id = t.board_id
FROM tasks t
WHERE al.task_id = t.id;

-- Make board_id required
ALTER TABLE activity_logs ALTER COLUMN board_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE activity_logs
    ADD CONSTRAINT fk_activity_log_board
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;

-- Make task_id optional (column activities have no task)
ALTER TABLE activity_logs ALTER COLUMN task_id DROP NOT NULL;

-- Index for board-level activity queries
CREATE INDEX idx_activity_logs_board_id ON activity_logs(board_id);
