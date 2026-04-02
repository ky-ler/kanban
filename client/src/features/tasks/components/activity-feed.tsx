import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityLogDto, CommentDto } from "@/api/gen/model";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";
import {
  useGetTaskActivityInfinite,
  type GetTaskActivityInfiniteQueryResult,
} from "@/api/gen/endpoints/activity-log-controller/activity-log-controller";
import {
  useGetTaskComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  getGetTaskCommentsQueryKey,
} from "@/api/gen/endpoints/comment-controller/comment-controller";
import { getGetTaskQueryKey } from "@/api/gen/endpoints/task-controller/task-controller";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  IconMessage,
  IconHistory,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { CommentInput } from "./comment-input";
import { CommentItem } from "./comment-item";
import { ActivityItem } from "./activity-item";
import { toast } from "sonner";
import { handleMutationAuthError } from "@/features/auth/route-auth";

type FeedItem =
  | { type: "comment"; data: CommentDto; timestamp: Date }
  | { type: "activity"; data: ActivityLogDto; timestamp: Date };

interface ActivityFeedProps {
  boardId: string;
  taskId: string;
  currentUserId?: string;
  mentionUsers?: MentionUser[];
  container?: HTMLElement | null;
}

export function ActivityFeed({
  boardId,
  taskId,
  currentUserId,
  mentionUsers = [],
  container,
}: ActivityFeedProps) {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  // Fetch comments
  const {
    data: commentsData,
    isLoading: commentsLoading,
    error: commentsError,
  } = useGetTaskComments(boardId, taskId);

  // Fetch activity (paginated with infinite query)
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetTaskActivityInfinite(boardId, taskId, undefined, {
    query: {
      initialPageParam: 0,
      getNextPageParam: (lastPage: GetTaskActivityInfiniteQueryResult) => {
        const page = lastPage.data;
        return page.last ? undefined : (page.number ?? 0) + 1;
      },
    },
  });

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || !showDetails) return;

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
  }, [hasNextPage, fetchNextPage, showDetails]);

  // Mutations
  const createCommentMutation = useCreateComment({
    mutation: {
      onSuccess: () => {
        // Invalidate both comments and task to ensure version is fresh
        queryClient.invalidateQueries({
          queryKey: getGetTaskCommentsQueryKey(boardId, taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to create comment");
      },
    },
  });

  const updateCommentMutation = useUpdateComment({
    mutation: {
      onSuccess: () => {
        // Invalidate both comments and task to ensure version is fresh
        queryClient.invalidateQueries({
          queryKey: getGetTaskCommentsQueryKey(boardId, taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to update comment");
      },
    },
  });

  const deleteCommentMutation = useDeleteComment({
    mutation: {
      onSuccess: () => {
        // Invalidate both comments and task to ensure version is fresh
        queryClient.invalidateQueries({
          queryKey: getGetTaskCommentsQueryKey(boardId, taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to delete comment");
      },
    },
  });

  const handleCreateComment = (content: string) => {
    createCommentMutation.mutate({
      boardId,
      taskId,
      data: { content },
    });
  };

  const handleUpdateComment = (commentId: string, content: string) => {
    updateCommentMutation.mutate({
      boardId,
      taskId,
      commentId,
      data: { content },
    });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate({
      boardId,
      taskId,
      commentId,
    });
  };

  if (commentsLoading || activityLoading) {
    return <LoadingSpinner className="py-8" />;
  }

  if (commentsError || activityError) {
    return (
      <div className="text-muted-foreground py-4 text-center">
        Failed to load activity
      </div>
    );
  }

  const comments = commentsData?.data ?? [];
  const activities =
    activityData?.pages.flatMap((page) => page.data.content ?? []) ?? [];

  // Merge comments and activities into a unified feed
  const feedItems: FeedItem[] = [
    ...comments.map((comment) => ({
      type: "comment" as const,
      data: comment,
      timestamp: new Date(comment.dateCreated),
    })),
    ...activities.map((activity) => ({
      type: "activity" as const,
      data: activity,
      timestamp: new Date(activity.dateCreated),
    })),
  ];

  // Sort by timestamp, newest first
  feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Filter based on showDetails toggle
  const visibleItems = showDetails
    ? feedItems
    : feedItems.filter((item) => item.type === "comment");

  const hasActivity = activities.length > 0;
  const hasComments = comments.length > 0;

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconMessage className="text-muted-foreground h-4 w-4" />
          <span className="font-medium">Comments and activity</span>
        </div>
        {hasActivity && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-auto px-2 py-1"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <IconChevronUp className="mr-1 h-3 w-3" />
                Hide details
              </>
            ) : (
              <>
                <IconChevronDown className="mr-1 h-3 w-3" />
                Show details
              </>
            )}
          </Button>
        )}
      </div>

      {/* Comment input */}
      <CommentInput
        onSubmit={handleCreateComment}
        isPending={createCommentMutation.isPending}
        mentionUsers={mentionUsers}
        container={container}
      />

      {/* Feed items */}
      {visibleItems.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
          {!hasComments && !hasActivity ? (
            <>
              <IconHistory className="mb-2 h-8 w-8" />
              <p className="">No activity yet</p>
            </>
          ) : (
            <p className="">No comments yet</p>
          )}
        </div>
      ) : (
        <div className="divide-border space-y-1 divide-y">
          {visibleItems.map((item) => {
            if (item.type === "comment") {
              return (
                <CommentItem
                  key={`comment-${item.data.id}`}
                  comment={item.data}
                  currentUserId={currentUserId}
                  mentionUsers={mentionUsers}
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                  isUpdating={updateCommentMutation.isPending}
                  isDeleting={deleteCommentMutation.isPending}
                  container={container}
                />
              );
            }
            return (
              <ActivityItem
                key={`activity-${item.data.id}`}
                activity={item.data}
              />
            );
          })}
          {showDetails && (
            <div ref={loadMoreRef} className="py-2">
              {isFetchingNextPage && <LoadingSpinner className="py-2" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
