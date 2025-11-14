import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FolderKanban, Plus } from "lucide-react";
import { NewBoardDialog } from "@/features/boards/components/new-board-dialog";
import { BoardSummaryCard } from "@/features/boards/components/board-summary-card";
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

export const Route = createFileRoute("/_protected/home")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getGetBoardsForUserQueryOptions()),
  component: BoardsComponent,
});

function BoardsComponent() {
  const { data: boards, isLoading, error } = useGetBoardsForUserSuspense();

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

  return (
    <div className="flex h-full flex-col gap-6">
      {boards.data.length === 0 ? (
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
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
              <p className="text-muted-foreground">
                Manage and collaborate on your boards
              </p>
            </div>
            <NewBoardDialog
              trigger={
                <Button>
                  <Plus className="h-5 w-5" /> New Board
                </Button>
              }
            />
          </div>

          <Separator />

          {/* Boards Grid */}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {boards.data.map((board: BoardSummary) => (
              <BoardSummaryCard key={board.id} board={board} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
