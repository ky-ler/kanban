import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  getGetNotificationsInfiniteQueryKey,
  getGetUnreadCountQueryKey,
  useGetNotificationsInfinite,
  useMarkAllAsRead,
  useMarkAsRead,
} from "@/api/gen/endpoints/notification-controller/notification-controller";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import { IconBellOff } from "@tabler/icons-react";
import PageWrapper from "@/components/page-wrapper";

export const Route = createFileRoute("/_protected/notifications/")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "View your notifications and keep up with board and task updates.",
      },
      {
        title: "Notifications - Velora",
      },
    ],
  }),
});

function NotificationsPage() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetNotificationsInfinite(
    { size: 20 },
    {
      query: {
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
          const page = lastPage.data;
          return page.last ? undefined : (page.number ?? 0) + 1;
        },
      },
    },
  );

  const markAsReadMutation = useMarkAsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsInfiniteQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetUnreadCountQueryKey(),
        });
      },
    },
  });

  const markAllAsReadMutation = useMarkAllAsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsInfiniteQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetUnreadCountQueryKey(),
        });
      },
    },
  });

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const notifications =
    notificationsData?.pages.flatMap((page) => page.data.content ?? []) ?? [];
  const hasUnread = notifications.some((notification) => !notification.isRead);

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return <LoadingSpinner title="Loading notifications..." />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <Alert variant="destructive">Failed to load notifications.</Alert>
      </div>
    );
  }

  return (
    // <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
    <PageWrapper>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {notifications.length} notification
            {notifications.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleMarkAllAsRead}
          disabled={!hasUnread || markAllAsReadMutation.isPending}
        >
          Mark all as read
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconBellOff />
              </EmptyMedia>
              <EmptyTitle>No notifications yet</EmptyTitle>
              <EmptyDescription>
                You&apos;ll be notified when teammates mention you, assign
                tasks, or update relevant boards.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
          <div ref={loadMoreRef} className="py-2">
            {isFetchingNextPage && <LoadingSpinner className="py-2" />}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
