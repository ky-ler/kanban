import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLabelColorClasses } from "../constants";
import type { LabelSummaryDto } from "@/api/gen/model";

interface LabelBadgeProps {
  label: LabelSummaryDto;
  size?: "sm" | "md";
  className?: string;
}

export function LabelBadge({ label, size = "sm", className }: LabelBadgeProps) {
  const colorClasses = getLabelColorClasses(label.color);

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClasses.bg,
        colorClasses.text,
        colorClasses.border,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className,
      )}
    >
      {label.name}
    </Badge>
  );
}
