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
        size === "sm"
          ? "h-5 px-2 leading-none"
          : "h-6 px-2.5 text-sm leading-none",
        className,
      )}
    >
      {label.name}
    </Badge>
  );
}
