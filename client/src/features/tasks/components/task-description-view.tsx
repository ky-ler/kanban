import { MarkdownView } from "@/components/rich-text/markdown-view";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";

interface TaskDescriptionViewProps {
  value: string;
  mentionUsers?: MentionUser[];
  container?: HTMLElement | null;
}

export function TaskDescriptionView({
  value,
  mentionUsers = [],
  container,
}: Readonly<TaskDescriptionViewProps>) {
  return (
    <MarkdownView
      value={value}
      mentionUsers={mentionUsers}
      container={container}
      emptyState={
        <span className="text-muted-foreground">
          Click to add a description...
        </span>
      }
    />
  );
}
