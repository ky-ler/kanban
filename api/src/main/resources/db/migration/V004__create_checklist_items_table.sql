CREATE TABLE checklist_items (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to_id VARCHAR(255),
    due_date DATE,
    position BIGINT NOT NULL,
    date_created TIMESTAMP NOT NULL,
    date_modified TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_checklist_item_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_checklist_item_assignee FOREIGN KEY (assigned_to_id) REFERENCES users(id),
    CONSTRAINT uk_checklist_item_task_position UNIQUE (task_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_checklist_items_task_id ON checklist_items(task_id);
