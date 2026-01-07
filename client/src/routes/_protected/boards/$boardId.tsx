import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Edit, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import {
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { KanbanBoard } from "@/features/boards/components/kanban-board";

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

  return (
    <>
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
      <KanbanBoard
        columns={board.data.columns ?? []}
        tasks={board.data.tasks ?? []}
        boardId={boardId}
      />
      <Outlet />
    </>
  );
}
