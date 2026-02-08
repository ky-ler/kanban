import { MarkdownView } from "@/components/rich-text/markdown-view";

interface TaskDescriptionViewProps {
  value: string;
}

export function TaskDescriptionView({
  value,
}: Readonly<TaskDescriptionViewProps>) {
  return (
    <MarkdownView
      value={value}
      emptyState={
        <span className="text-muted-foreground text-sm italic">
          Click to add a description...
        </span>
      }
    />
  );
}
