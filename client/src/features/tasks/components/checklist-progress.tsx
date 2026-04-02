import type { ChecklistProgressDto } from "@/api/gen/model";
import { cn } from "@/lib/utils";

interface ChecklistProgressProps {
  progress?: ChecklistProgressDto;
  className?: string;
  compact?: boolean;
}

export function ChecklistProgress({
  progress,
  className,
  compact = false,
}: ChecklistProgressProps) {
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (total <= 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {!compact && (
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Checklist</span>
          <span>{`${completed}/${total}`}</span>
        </div>
      )}
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
