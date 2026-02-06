-- Add is_favorite column to board_users
ALTER TABLE board_users ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing default boards to favorites
UPDATE board_users
SET is_favorite = TRUE
WHERE (board_id, user_id) IN (
    SELECT default_board_id, id
    FROM users
    WHERE default_board_id IS NOT NULL
);

-- Remove old default_board_id column
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_default_board;
ALTER TABLE users DROP COLUMN IF EXISTS default_board_id;

-- Add index for performance
CREATE INDEX idx_board_users_favorite ON board_users(user_id, is_favorite) WHERE is_favorite = TRUE;
