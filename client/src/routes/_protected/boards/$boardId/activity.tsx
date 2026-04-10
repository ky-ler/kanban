import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import {
  useGetBoardActivityInfinite,
  getGetBoardActivityInfiniteQueryKey,
  type GetBoardActivityInfiniteQueryResult,
} from "@/api/gen/endpoints/board-activity-controller/board-activity-controller";
import { useBoardSubscription } from "@/features/boards/hooks/use-board-subscription";
import { BoardEventType } from "@/features/boards/constants/board-event-type";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityItem } from "@/features/tasks/components/activity-item";
import { IconHistory } from "@tabler/icons-react";
import { rethrowProtectedRouteError } from "@/features/auth/route-auth";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_protected/boards/$boardId/activity")({
  loader: async ({
    context: { queryClient },
    params: { boardId },
    location,
  }) => {
    try {
      return await queryClient.ensureQueryData(
        getGetBoardQueryOptions(boardId),
      );
    } catch (error) {
      rethrowProtectedRouteError(
        error,
        `${location.pathname}${location.searchStr}${location.hash}`,
      );
    }
  },
  component: BoardActivityComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: `Activity feed for your board: ${loaderData?.data.name}.`,
      },
      {
        title: `Activity - ${loaderData?.data.name} - Velora`,
      },
    ],
  }),
});

function BoardActivityComponent() {
  const navigate = useNavigate();
  const { boardId } = Route.useParams();
  const { data: board } = useGetBoardSuspense(boardId);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useBoardSubscription(boardId, {
    onEvent: (event) => {
      if (event.type === BoardEventType.ACTIVITY_LOGGED) {
        queryClient.invalidateQueries({
          queryKey: getGetBoardActivityInfiniteQueryKey(boardId),
        });
      }
    },
  });

  const {
    data: activityData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetBoardActivityInfinite(boardId, undefined, {
    query: {
      initialPageParam: 0,
      getNextPageParam: (lastPage: GetBoardActivityInfiniteQueryResult) => {
        const page = lastPage.data;
        return page.last ? undefined : (page.number ?? 0) + 1;
      },
    },
  });

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const returnToBoard = (open: boolean) => {
    if (!open) {
      navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: {
          q: undefined,
          assignee: undefined,
          priority: undefined,
          labels: undefined,
          due: undefined,
          archive: undefined,
        },
      });
    }
  };

  const activities =
    activityData?.pages.flatMap((page) => page.data.content ?? []) ?? [];

  return (
    <Dialog open={true} modal={true} onOpenChange={returnToBoard}>
      <DialogContent className="pb-0 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconHistory className="h-5 w-5" />
            Board Activity
          </DialogTitle>
          <DialogDescription>
            Recent activity across all tasks and columns in {board?.data.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingSpinner className="py-8" />
        ) : error ? (
          <div className="text-muted-foreground py-4 text-center">
            Failed to load activity
          </div>
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
            <IconHistory className="mb-2 h-8 w-8" />
            <p>No activity yet</p>
          </div>
        ) : (
          <ScrollArea className="-mx-4 max-h-[75vh] px-4">
            {activities.map((activity, index) => {
              const columnName = (() => {
                if (!activity.details) return null;
                try {
                  return (
                    ((JSON.parse(activity.details) as Record<string, unknown>)
                      ?.columnName as string | undefined) ?? null
                  );
                } catch {
                  return null;
                }
              })();

              return (
                <div key={activity.id} className="space-y-0.5">
                  {activity.taskId && activity.taskTitle ? (
                    <Link
                      to="/boards/$boardId/tasks/$taskId"
                      params={{ boardId, taskId: activity.taskId }}
                      search={{
                        q: undefined,
                        assignee: undefined,
                        priority: undefined,
                        labels: undefined,
                        due: undefined,
                        archive: undefined,
                      }}
                      className="text-muted-foreground hover:text-foreground text-xs font-medium wrap-anywhere transition-colors"
                    >
                      {activity.taskTitle}
                    </Link>
                  ) : columnName ? (
                    <span className="text-muted-foreground text-xs font-medium wrap-anywhere">
                      {columnName}
                    </span>
                  ) : null}
                  <ActivityItem activity={activity} />
                  {index < activities.length - 1 ? (
                    <Separator className="my-2" />
                  ) : null}
                </div>
              );
            })}
            <div ref={loadMoreRef} className="py-2">
              {isFetchingNextPage && <LoadingSpinner className="py-2" />}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
