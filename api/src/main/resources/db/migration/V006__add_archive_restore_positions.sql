ALTER TABLE columns ADD COLUMN restore_position INTEGER;
ALTER TABLE tasks ADD COLUMN restore_position BIGINT;

UPDATE columns
SET restore_position = position
WHERE is_archived = TRUE AND restore_position IS NULL;

UPDATE tasks
SET restore_position = position
WHERE is_archived = TRUE AND restore_position IS NULL;
