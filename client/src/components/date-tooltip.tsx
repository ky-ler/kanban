import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DateTooltipProps {
  date: Date | string;
  children: React.ReactNode;
  showTime?: boolean;
}

export function DateTooltip({
  date,
  children,
  showTime = false,
}: DateTooltipProps) {
  const d = date instanceof Date ? date : new Date(date);
  const exactDate = d.toLocaleString(undefined, {
    dateStyle: "full",
    ...(showTime ? { timeStyle: "short" } : {}),
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{exactDate}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
