import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Calendar, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  getGetArchivedBoardsForUserQueryOptions,
  useGetArchivedBoardsForUserSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { useUpdateBoardArchive } from "@/api/gen/endpoints/board-controller/board-controller";
import { getGetBoardsForUserQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { getGetArchivedBoardsForUserQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardSummary } from "@/api/gen/model";
import { handleMutationAuthError } from "@/features/auth/route-auth";

export const Route = createFileRoute("/_protected/boards/archived")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getGetArchivedBoardsForUserQueryOptions()),
  component: ArchivedBoardsComponent,
});

function ArchivedBoardCard({
  board,
  onUnarchive,
  isUnarchiving,
}: {
  board: BoardSummary;
  onUnarchive: (boardId: string) => void;
  isUnarchiving: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="line-clamp-1">{board.name}</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="xs"
            onClick={() => onUnarchive(board.id)}
            disabled={isUnarchiving}
          >
            <RotateCcw className="size-3" />
            Restore
          </Button>
        </CardAction>
        {board.description && (
          <CardDescription className="line-clamp-2">
            {board.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            {board.completedTasks}/{board.totalTasks} tasks
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(board.dateModified).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ArchivedBoardsComponent() {
  const { data: boards, isLoading } = useGetArchivedBoardsForUserSuspense();
  const queryClient = useQueryClient();

  const { mutate: unarchive, isPending: isUnarchiving } =
    useUpdateBoardArchive({
      mutation: {
        onSuccess: () => {
          toast.success("Board unarchived successfully");
          queryClient.invalidateQueries({
            queryKey: getGetArchivedBoardsForUserQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetBoardsForUserQueryKey(),
          });
        },
        onError: (error: unknown) => {
          if (handleMutationAuthError(error)) {
            return;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          if (message.includes("409")) {
            toast.error(
              "Board limit reached. Archive or leave another board first.",
            );
          } else {
            toast.error("Failed to unarchive board");
          }
        },
      },
    });

  const handleUnarchive = (boardId: string) => {
    unarchive({
      boardId,
      data: { isArchived: false, confirmArchiveTasks: false },
    });
  };

  if (isLoading || !boards) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner title="Loading archived boards..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Archive</h1>
        <p className="text-xs text-muted-foreground">
          {boards.data.length} archived board
          {boards.data.length !== 1 ? "s" : ""}
        </p>
      </div>

      {boards.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive />
            </EmptyMedia>
            <EmptyTitle>No archived boards</EmptyTitle>
            <EmptyDescription>
              When you archive a board, it will appear here. You can restore it
              at any time.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.data.map((board: BoardSummary) => (
            <ArchivedBoardCard
              key={board.id}
              board={board}
              onUnarchive={handleUnarchive}
              isUnarchiving={isUnarchiving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
