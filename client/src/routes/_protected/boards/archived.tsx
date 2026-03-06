import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Calendar, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="line-clamp-1 text-base">
              {board.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {board.description || "No description"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUnarchive(board.id)}
            disabled={isUnarchiving}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Unarchive
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span>
            {board.completedTasks}/{board.totalTasks} tasks
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
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

  const { mutate: unarchive, isPending: isUnarchiving } = useUpdateBoardArchive(
    {
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
    },
  );

  const handleUnarchive = (boardId: string) => {
    unarchive({
      boardId,
      data: { isArchived: false, confirmArchiveTasks: false },
    });
  };

  if (isLoading || !boards) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <LoadingSpinner title="Loading archived boards..." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Archived Boards</h1>
        <p className="text-muted-foreground">
          View and restore your archived boards
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
              When you archive a board, it will appear here. You can unarchive
              it at any time.
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
