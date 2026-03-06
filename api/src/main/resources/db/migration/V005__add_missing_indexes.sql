CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_board_users_user_id ON board_users(user_id);
CREATE INDEX idx_columns_board_id ON columns(board_id);
