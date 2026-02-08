import { useGetTaskActivity } from "@/api/gen/endpoints/activity-log-controller/activity-log-controller";
import { ActivityItem } from "./activity-item";
import { LoadingSpinner } from "@/components/loading-spinner";
import { History } from "lucide-react";

interface ActivityListProps {
  boardId: string;
  taskId: string;
}

export function ActivityList({ boardId, taskId }: ActivityListProps) {
  const { data, isLoading, error } = useGetTaskActivity(boardId, taskId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        Failed to load activity
      </div>
    );
  }

  const activities = data?.data ?? [];

  if (activities.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-8">
        <History className="mb-2 h-8 w-8" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="divide-border space-y-1 divide-y">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
