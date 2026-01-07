import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Edit, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import {
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { KanbanBoard } from "@/features/boards/components/kanban-board";
import { useBoardEvents } from "@/features/boards/hooks/use-board-events";
import { TaskFilterBar } from "@/features/boards/components/task-filter-bar";
import {
  filterTasks,
  parseFiltersFromSearch,
  filtersToSearchParams,
  type TaskFilters,
} from "@/features/boards/utils/filter-tasks";

export const Route = createFileRoute("/_protected/boards/$boardId")({
  validateSearch: (search: Record<string, unknown>) => ({
    assignee: search.assignee as string | undefined,
    priority: search.priority as string | undefined,
    labels: search.labels as string | undefined,
    due: search.due as string | undefined,
  }),
  loader: ({ context: { queryClient }, params: { boardId } }) =>
    queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
  component: BoardComponent,
});

function BoardComponent() {
  const { boardId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: board, isLoading, error } = useGetBoardSuspense(boardId);

  // Subscribe to real-time board events
  useBoardEvents(boardId);

  // Parse filters from URL search params
  const filters = parseFiltersFromSearch(search);

  // Handle filter changes
  const handleFiltersChange = (newFilters: TaskFilters) => {
    const searchParams = filtersToSearchParams(newFilters);
    navigate({
      to: ".",
      search: searchParams,
      replace: true,
    });
  };

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

  // Filter tasks based on active filters
  const filteredTasks = filterTasks(board.data.tasks ?? [], filters);

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
                  search={{ assignee: undefined, priority: undefined, labels: undefined, due: undefined }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Collaborators
                </Link>
              </Button>

              <Button variant="outline" size="sm" asChild>
                <Link
                  to={"/boards/$boardId/edit"}
                  params={{ boardId }}
                  search={{ assignee: undefined, priority: undefined, labels: undefined, due: undefined }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Board
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
      {/* Filter Bar */}
      <div className="px-4 pt-4">
        <TaskFilterBar
          boardId={boardId}
          collaborators={board.data.collaborators ?? []}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
      {/* Kanban Board */}
      <KanbanBoard
        columns={board.data.columns ?? []}
        tasks={filteredTasks}
        boardId={boardId}
      />
      <Outlet />
    </>
  );
}
