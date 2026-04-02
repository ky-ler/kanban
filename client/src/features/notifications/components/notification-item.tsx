import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateTooltip } from "@/components/date-tooltip";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "@/api/gen/model";

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead?: (id: string) => void;
  onClose?: () => void;
}

function NotificationItemComponent({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const navigate = useNavigate();

  const date = new Date(notification.dateCreated);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  const handleClick = () => {
    // Mark as read if not already
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to the task
    void navigate({
      to: "/boards/$boardId/tasks/$taskId",
      params: {
        boardId: notification.boardId,
        taskId: notification.taskId,
      },
      search: {
        q: undefined,
        assignee: undefined,
        priority: undefined,
        labels: undefined,
        due: undefined,
        archive: undefined,
      },
    });

    // Close the popover
    onClose?.();
  };

  const initials = notification.actor.username?.charAt(0).toUpperCase() ?? "?";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full gap-3 rounded-md p-2 text-left wrap-anywhere hyphens-auto transition-colors",
        "hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        !notification.isRead && "bg-muted/30",
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="flex items-start pt-2">
          <div className={cn("size-2 rounded-full bg-blue-500")} />
        </div>
      )}

      {/* Avatar */}
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarImage
          src={notification.actor.profileImageUrl}
          alt={notification.actor.username}
          referrerPolicy="no-referrer"
        />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{notification.message}</p>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          <span className="truncate">{notification.boardName}</span>
          <span>•</span>
          <DateTooltip date={date} showTime>
            <span className="cursor-default whitespace-nowrap">{timeAgo}</span>
          </DateTooltip>
        </div>
      </div>
    </button>
  );
}

export const NotificationItem = memo(NotificationItemComponent);
