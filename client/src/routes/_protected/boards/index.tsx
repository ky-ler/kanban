import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IconArchive,
  IconCircleCheck,
  IconLayoutKanban,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
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
import { ArchivedBoardsModal } from "@/features/boards/components/archived-boards-modal";

export const Route = createFileRoute("/_protected/boards/")({
  validateSearch: (search: Record<string, unknown>) => ({
    archive: search.archive === "boards" ? "boards" : undefined,
  }),
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
        archive: undefined,
      }}
      className="group/link block"
    >
      <Card className="relative transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="group-hover/link:text-primary line-clamp-1 text-sm font-semibold transition-colors">
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
            <div className="flex items-center justify-between">
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
          <div className="text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-1">
              <IconCircleCheck className="size-3" />
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
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: boards, isLoading, error } = useGetBoardsForUserSuspense();
  const isArchiveModalOpen = search.archive === "boards";

  if (isLoading || !boards) {
    return <LoadingSpinner title="Loading boards..." />;
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
              <IconLayoutKanban />
            </EmptyMedia>
            <EmptyTitle>No boards yet</EmptyTitle>
            <EmptyDescription>
              Create your first board to start organizing tasks and
              collaborating with your team.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <NewBoardDialog
                trigger={
                  <Button>
                    <IconPlus className="size-3.5" />
                    Create Your First Board
                  </Button>
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/boards",
                    search: { archive: "boards" },
                    replace: true,
                  })
                }
              >
                <IconArchive data-icon="inline-start" />
                Archived Boards
              </Button>
            </div>
          </EmptyContent>
        </Empty>
        <ArchivedBoardsModal
          open={isArchiveModalOpen}
          onOpenChange={(open) =>
            navigate({
              to: "/boards",
              search: { archive: open ? "boards" : undefined },
              replace: true,
            })
          }
        />
      </div>
    );
  }

  const favoriteBoards = boards.data.filter((b) => b.isFavorite);
  const allBoards = boards.data.filter((b) => !b.isFavorite);

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Boards</h1>
            <p className="text-muted-foreground">
              {allBoards.length} board{allBoards.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/boards",
                search: { archive: "boards" },
                replace: true,
              })
            }
          >
            <IconArchive data-icon="inline-start" />
            Archived Boards
          </Button>
        </div>

        {/* Favorites Section */}
        {favoriteBoards.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <IconStar className="size-3.5 fill-yellow-400 text-yellow-400" />
              <h2 className="text-muted-foreground font-medium tracking-wider uppercase">
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
            <h2 className="text-muted-foreground font-medium tracking-wider uppercase">
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

      <ArchivedBoardsModal
        open={isArchiveModalOpen}
        onOpenChange={(open) =>
          navigate({
            to: "/boards",
            search: { archive: open ? "boards" : undefined },
            replace: true,
          })
        }
      />
    </>
  );
}
