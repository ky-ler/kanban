import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPriorityMeta } from "../constants/priorities";
import { PriorityAntennaIcon } from "./priority-antenna-icon";

interface PrioritySignalProps {
  priority?: string | null;
  className?: string;
}

export function PrioritySignal({ priority, className }: PrioritySignalProps) {
  const meta = getPriorityMeta(priority);
  const label = meta?.label ?? "No priority";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex h-5 items-center justify-center rounded-4xl border",
            className,
          )}
          aria-label={label}
        >
          <PriorityAntennaIcon priority={priority} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
