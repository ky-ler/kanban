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
      <div className="text-sm text-muted-foreground py-4 text-center">
        Failed to load activity
      </div>
    );
  }

  const activities = data?.data ?? [];

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 divide-y divide-border">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
