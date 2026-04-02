import { useState } from "react";
import { IconBell } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "./notification-dropdown";
import { useGetUnreadCount } from "@/api/gen/endpoints/notification-controller/notification-controller";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCountData } = useGetUnreadCount({
    query: {
      refetchInterval: 60000, // Refetch every minute as fallback
    },
  });

  const unreadCount = unreadCountData?.data.count ?? 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount.toString();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <IconBell />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] rounded-full bg-red-500 px-1 py-0.5",
                "text-[10px] leading-none font-medium text-white",
              )}
            >
              {displayCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="gap-0 p-0">
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
