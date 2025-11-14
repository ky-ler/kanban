import { TaskItem } from "@/features/tasks/components/task-item";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Edit, Plus, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import {
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { TaskSummaryDto } from "@/api/gen/model";

export const Route = createFileRoute("/_protected/boards/$boardId")({
  loader: ({ context: { queryClient }, params: { boardId } }) =>
    queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
  component: BoardComponent,
});

function BoardComponent() {
  const { boardId } = Route.useParams();
  const { data: board, isLoading, error } = useGetBoardSuspense(boardId);

  if (!board || isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        Error loading board: {error as string}
      </Alert>
    );
  }

  // Categorize tasks by their columns
  const columnTasksMap: Record<string, TaskSummaryDto[]> = {};
  board.data.columns?.forEach((column) => {
    columnTasksMap[column.id] = (
      board.data.tasks?.filter((task) => task.columnId === column.id) ?? []
    ).sort((a, b) => a.position - b.position);
  });

  // Sort columns by position
  const sortedColumns = [...(board.data.columns ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <>
      {/* <div className="flex h-full flex-col gap-6"> */}
      {/* <DndContext></DndContext> */}
      {/* Board Info */}
      <div className="px-4 pt-6">
        <Card>
          <CardHeader className="flex flex-col items-center justify-between sm:flex-row">
            <div>
              <CardTitle className="text-2xl font-bold">
                {board.data.name}
              </CardTitle>
              <CardDescription>
                {board.data.description || "No description provided"}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={"/boards/$boardId/collaborators"}
                  params={{ boardId }}
                  from={Route.fullPath}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Collaborators
                </Link>
              </Button>

              <Button variant="outline" size="sm" asChild>
                <Link
                  to={"/boards/$boardId/edit"}
                  params={{ boardId }}
                  from={Route.fullPath}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Board
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
      {/* Kanban Board */}
      <div className="flex grow px-4">
        <div className="-mx-4 overflow-x-auto">
          <div className="flex space-x-4 px-4">
            {sortedColumns.map((column) => {
              const tasks = columnTasksMap[column.id] || [];
              return (
                <Card
                  key={column.id}
                  className="h-fit justify-between gap-2 sm:min-w-3xs"
                >
                  <CardHeader>
                    <CardTitle>{column.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {tasks.map((task) => (
                      <TaskItem key={task.id} task={task} boardId={boardId} />
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full justify-start"
                    >
                      <Link
                        to="/boards/$boardId/tasks/create"
                        params={{ boardId }}
                        search={{ columnId: column.id }}
                      >
                        <Plus className="size-5" />
                        Add a Task
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      {/* </div> */}
      <Outlet />
    </>
  );
}
