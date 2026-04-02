import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              colorClasses.bg,
              colorClasses.text,
              colorClasses.border,
              size === "sm"
                ? "h-5 max-w-40 px-2"
                : "h-6 max-w-60 px-2.5 text-sm",
              className,
            )}
            aria-label={label.name}
          >
            <span className="truncate">{label.name}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label.name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
