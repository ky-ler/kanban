import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityLogDto, CommentDto } from "@/api/gen/model";
import { useGetTaskActivity } from "@/api/gen/endpoints/activity-log-controller/activity-log-controller";
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
import { MessageSquare, History, ChevronDown, ChevronUp } from "lucide-react";
import { CommentInput } from "./comment-input";
import { CommentItem } from "./comment-item";
import { ActivityItem } from "./activity-item";
import { toast } from "sonner";

type FeedItem =
  | { type: "comment"; data: CommentDto; timestamp: Date }
  | { type: "activity"; data: ActivityLogDto; timestamp: Date };

interface ActivityFeedProps {
  boardId: string;
  taskId: string;
  currentUserId?: string;
}

export function ActivityFeed({
  boardId,
  taskId,
  currentUserId,
}: ActivityFeedProps) {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  // Fetch comments
  const {
    data: commentsData,
    isLoading: commentsLoading,
    error: commentsError,
  } = useGetTaskComments(boardId, taskId);

  // Fetch activity
  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
  } = useGetTaskActivity(boardId, taskId);

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
      onError: () => {
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
      onError: () => {
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
      onError: () => {
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
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (commentsError || activityError) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        Failed to load activity
      </div>
    );
  }

  const comments = commentsData?.data ?? [];
  const activities = activityData?.data ?? [];

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
          <MessageSquare className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">Comments and activity</span>
        </div>
        {hasActivity && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-auto px-2 py-1 text-xs hover:text-foreground"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" />
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
      />

      {/* Feed items */}
      {visibleItems.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
          {!hasComments && !hasActivity ? (
            <>
              <History className="mb-2 h-8 w-8" />
              <p className="text-sm">No activity yet</p>
            </>
          ) : (
            <p className="text-sm">No comments yet</p>
          )}
        </div>
      ) : (
        <div className="space-y-1 divide-y divide-border">
          {visibleItems.map((item) => {
            if (item.type === "comment") {
              return (
                <CommentItem
                  key={`comment-${item.data.id}`}
                  comment={item.data}
                  currentUserId={currentUserId}
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                  isUpdating={updateCommentMutation.isPending}
                  isDeleting={deleteCommentMutation.isPending}
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
        </div>
      )}
    </div>
  );
}
