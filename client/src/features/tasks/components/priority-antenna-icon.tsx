import {
  IconAntennaBars1,
  IconAntennaBars2,
  IconAntennaBars3,
  IconAntennaBars4,
  IconAntennaBars5,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { getPriorityMeta } from "../constants/priorities";

interface PriorityAntennaIconProps {
  priority?: string | null;
  className?: string;
}

type PriorityIconLevel = 1 | 2 | 3 | 4 | 5;

const PRIORITY_ICON_BY_LEVEL: Record<
  PriorityIconLevel,
  typeof IconAntennaBars1
> = {
  1: IconAntennaBars1,
  2: IconAntennaBars2,
  3: IconAntennaBars3,
  4: IconAntennaBars4,
  5: IconAntennaBars5,
};

export function PriorityAntennaIcon({
  priority,
  className,
}: PriorityAntennaIconProps) {
  const meta = getPriorityMeta(priority);
  const level: PriorityIconLevel = meta
    ? ((meta.level + 1) as PriorityIconLevel)
    : 1;
  const Icon = PRIORITY_ICON_BY_LEVEL[level];

  return <Icon aria-hidden="true" className={cn("size-6", className)} />;
}
