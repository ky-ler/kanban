-- Convert task positions from contiguous integers to fractional indexing spacing.
-- This allows moving a task by computing a midpoint between neighbors,
-- updating only 1 row instead of O(n) rows per move.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS uk_task_column_position;

ALTER TABLE tasks ALTER COLUMN position TYPE BIGINT;

-- Re-space existing positions with a gap of 1,000,000 between each task
WITH ranked AS (
    SELECT id, column_id,
           ROW_NUMBER() OVER (PARTITION BY column_id ORDER BY position) * 1000000 AS new_pos
    FROM tasks
)
UPDATE tasks t SET position = r.new_pos FROM ranked r WHERE t.id = r.id;

-- Re-add the unique constraint as DEFERRABLE so rebalancing can temporarily
-- have duplicates within a single transaction
ALTER TABLE tasks ADD CONSTRAINT uk_task_column_position
    UNIQUE (column_id, position) DEFERRABLE INITIALLY DEFERRED;
