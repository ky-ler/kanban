import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, FolderKanban, Plus, Star } from "lucide-react";
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

function BoardListItem({
  board,
  isSelected,
  onSelect,
}: {
  board: BoardSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const progress =
    board.totalTasks > 0
      ? Math.round((board.completedTasks / board.totalTasks) * 100)
      : 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/50 border-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        {board.isFavorite && (
          <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
        )}
        <span className="line-clamp-1 font-medium">{board.name}</span>
      </div>
      <div className="text-muted-foreground mt-1 text-sm">
        {board.completedTasks}/{board.totalTasks} tasks
      </div>
      <div className="bg-secondary mt-2 h-1.5 w-full rounded-full">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

function BoardPreviewPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="bg-muted rounded-full p-4">
        <FolderKanban className="text-muted-foreground h-8 w-8" />
      </div>
      <p className="text-muted-foreground">Select a board to view details</p>
    </div>
  );
}

function BoardPreviewContent({ board }: { board: BoardSummary }) {
  const progress =
    board.totalTasks > 0
      ? Math.round((board.completedTasks / board.totalTasks) * 100)
      : 0;

  return (
    <div className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="line-clamp-2">{board.name}</CardTitle>
          <FavoriteButton
            boardId={board.id}
            isFavorite={board.isFavorite}
            showLabel
            variant="outline"
          />
        </div>
        <CardDescription className="line-clamp-3">
          {board.description || "No description yet"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="bg-secondary h-2.5 w-full rounded-full">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {board.completedTasks} of {board.totalTasks} tasks completed
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Total Tasks
            </p>
            <p className="mt-1 text-2xl font-semibold">{board.totalTasks}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Completed
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {board.completedTasks}
            </p>
          </div>
        </div>

        {/* Last Modified */}
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>
            Last modified: {new Date(board.dateModified).toLocaleDateString()}
          </span>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
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
          >
            Open Board
          </Link>
        </Button>
      </CardFooter>
    </div>
  );
}

function BoardsComponent() {
  const { data: boards, isLoading, error } = useGetBoardsForUserSuspense();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const selectedBoard =
    boards?.data.find((b) => b.id === selectedBoardId) ?? null;

  if (isLoading || !boards) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <LoadingSpinner title="Loading boards..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        Error loading boards: {error as string}
      </Alert>
    );
  }

  if (boards.data.length === 0) {
    return (
      <div className="flex h-full flex-col gap-6 p-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant={"icon"}>
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No boards yet</EmptyTitle>
            <EmptyDescription>
              Get started by creating your first board. You can invite team
              members and start organizing your work.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewBoardDialog
              trigger={<Button>Create Your First Board</Button>}
            />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Boards</h1>
          <p className="text-muted-foreground">
            Organize and manage your projects
          </p>
        </div>
        <NewBoardDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> New Board
            </Button>
          }
        />
      </div>

      {/* Split Layout */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        {/* Left Panel - Board List */}
        <Card className="flex flex-col md:w-80 lg:w-96">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Boards</CardTitle>
            <CardDescription>{boards.data.length} boards</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[300px] px-4 pb-4 md:h-full">
              <div className="space-y-2">
                {boards.data.map((board: BoardSummary) => (
                  <BoardListItem
                    key={board.id}
                    board={board}
                    isSelected={selectedBoardId === board.id}
                    onSelect={() => setSelectedBoardId(board.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Preview */}
        <Card className="flex min-h-[400px] flex-1 flex-col md:min-h-0">
          {selectedBoard ? (
            <BoardPreviewContent board={selectedBoard} />
          ) : (
            <BoardPreviewPlaceholder />
          )}
        </Card>
      </div>
    </div>
  );
}
