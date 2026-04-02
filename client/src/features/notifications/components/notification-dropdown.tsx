import { useEffect, useMemo, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { IconCheck, IconBellOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "./notification-item";
import {
  getGetNotificationsInfiniteQueryKey,
  getGetUnreadCountQueryKey,
  useGetNotificationsInfinite,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/api/gen/endpoints/notification-controller/notification-controller";

interface NotificationDropdownProps {
  onClose?: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data: notificationsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetNotificationsInfinite(
    { size: 10, unreadOnly: true },
    {
      query: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => {
          const page = lastPage.data;
          if (page.last || page.number === undefined) {
            return undefined;
          }
          return page.number + 1;
        },
        initialPageParam: 0,
      },
    },
  );

  const markAsReadMutation = useMarkAsRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetNotificationsInfiniteQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getGetUnreadCountQueryKey(),
        });
      },
    },
  });
  const markAllAsReadMutation = useMarkAllAsRead({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetNotificationsInfiniteQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getGetUnreadCountQueryKey(),
        });
      },
    },
  });

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate({ id });
    },
    [markAsReadMutation],
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleViewAllNotifications = () => {
    onClose?.();
    void navigate({ to: "/notifications" });
  };

  // Infinite scroll trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const el = loadMoreRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const notifications = useMemo(
    () =>
      notificationsData?.pages.flatMap((page) => page.data.content ?? []) ?? [],
    [notificationsData],
  );
  const hasUnread = useMemo(
    () => notifications.some((n) => !n.isRead),
    [notifications],
  );

  if (isLoading) {
    return (
      <div className="w-80 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 p-3">
        <p className="text-destructive text-sm">Failed to load notifications</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="font-semibold">Notifications</h3>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <IconCheck className="mr-1" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <IconBellOff className="text-muted-foreground mb-2 size-10" />
          <p className="text-muted-foreground text-sm">
            No unread notifications
          </p>
        </div>
      ) : (
        <ScrollArea className="h-48 max-h-80">
          {/* <div className="p-1 wrap-anywhere hyphens-auto"> */}
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onClose={onClose}
            />
          ))}
          {/* Load more trigger */}
          {isFetchingNextPage && (
            <div ref={loadMoreRef} className="h-4">
              <div className="flex justify-center py-2">
                <div className="border-primary animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            </div>
          )}
          {/* </div> */}
        </ScrollArea>
      )}

      <Separator />
      <div className="p-1">
        <Button
          variant="ghost"
          size="default"
          className="w-full justify-center px-0"
          onClick={handleViewAllNotifications}
        >
          View all notifications
        </Button>
      </div>
    </>
  );
}
