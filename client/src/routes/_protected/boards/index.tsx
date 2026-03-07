import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, FolderKanban, Plus, Star } from "lucide-react";
import { NewBoardDialog } from "@/features/boards/components/new-board-dialog";
import { FavoriteButton } from "@/features/boards/components/favorite-button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert } from "@/components/ui/alert";
import type { BoardSummary } from "@/api/gen/model";
import {
  getGetBoardsForUserQueryOptions,
  useGetBoardsForUserSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_protected/boards/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getGetBoardsForUserQueryOptions()),
  component: BoardsComponent,
});

function BoardCard({ board }: { board: BoardSummary }) {
  const progress =
    board.totalTasks > 0
      ? Math.round((board.completedTasks / board.totalTasks) * 100)
      : 0;

  return (
    <Link
      to="/boards/$boardId"
      params={{ boardId: String(board.id) }}
      search={{
        q: undefined,
        assignee: undefined,
        priority: undefined,
        labels: undefined,
        due: undefined,
      }}
      className="group/link block"
    >
      <Card className="relative transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="line-clamp-1 text-sm font-semibold group-hover/link:text-primary transition-colors">
            {board.name}
          </CardTitle>
          <CardAction>
            <FavoriteButton
              boardId={board.id}
              isFavorite={board.isFavorite}
              variant="ghost"
              size="icon-sm"
            />
          </CardAction>
          {board.description && (
            <CardDescription className="line-clamp-2">
              {board.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <div className="bg-secondary h-1 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progress === 100 ? "bg-green-500" : "bg-primary",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              <span>
                {board.completedTasks}/{board.totalTasks} tasks
              </span>
            </div>
            <span>{new Date(board.dateModified).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function BoardsComponent() {
  const { data: boards, isLoading, error } = useGetBoardsForUserSuspense();

  if (isLoading || !boards) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner title="Loading boards..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          Error loading boards: {error as string}
        </Alert>
      </div>
    );
  }

  if (boards.data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No boards yet</EmptyTitle>
            <EmptyDescription>
              Create your first board to start organizing tasks and
              collaborating with your team.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewBoardDialog
              trigger={
                <Button>
                  <Plus className="size-3.5" />
                  Create Your First Board
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const favoriteBoards = boards.data.filter((b) => b.isFavorite);
  const allBoards = boards.data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Boards</h1>
        <p className="text-xs text-muted-foreground">
          {allBoards.length} board{allBoards.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Favorites Section */}
      {favoriteBoards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Favorites
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteBoards.map((board: BoardSummary) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      )}

      {/* All Boards */}
      <section className="space-y-3">
        {favoriteBoards.length > 0 && (
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            All Boards
          </h2>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBoards.map((board: BoardSummary) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      </section>
    </div>
  );
}
