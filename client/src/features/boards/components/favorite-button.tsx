import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useToggleFavorite,
  getGetBoardsForUserQueryKey,
  getGetBoardQueryKey,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardSummary, BoardDto } from "@/api/gen/model";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  boardId: string;
  isFavorite: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
  showLabel?: boolean;
  className?: string;
  /** Render as a div with role="button" instead of a button element (for nesting inside other buttons) */
  asDiv?: boolean;
}

export function FavoriteButton({
  boardId,
  isFavorite,
  size = "icon",
  variant = "ghost",
  showLabel = false,
  className,
}: FavoriteButtonProps) {
  const queryClient = useQueryClient();

  const { mutate: toggleFavorite, isPending } = useToggleFavorite({
    mutation: {
      onMutate: async () => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: getGetBoardsForUserQueryKey(),
        });
        await queryClient.cancelQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });

        // Snapshot the previous values
        const previousBoards = queryClient.getQueryData<{
          data: BoardSummary[];
        }>(getGetBoardsForUserQueryKey());
        const previousBoard = queryClient.getQueryData<{ data: BoardDto }>(
          getGetBoardQueryKey(boardId),
        );

        // Optimistically update the boards list
        queryClient.setQueryData<{ data: BoardSummary[] }>(
          getGetBoardsForUserQueryKey(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.map((board) =>
                board.id === boardId
                  ? { ...board, isFavorite: !board.isFavorite }
                  : board,
              ),
            };
          },
        );

        // Optimistically update the individual board query
        queryClient.setQueryData<{ data: BoardDto }>(
          getGetBoardQueryKey(boardId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              data: { ...old.data, isFavorite: !old.data.isFavorite },
            };
          },
        );

        return { previousBoards, previousBoard };
      },
      onError: (_error, _variables, context) => {
        // Rollback on error
        if (context?.previousBoards) {
          queryClient.setQueryData(
            getGetBoardsForUserQueryKey(),
            context.previousBoards,
          );
        }
        if (context?.previousBoard) {
          queryClient.setQueryData(
            getGetBoardQueryKey(boardId),
            context.previousBoard,
          );
        }
        toast.error("Failed to update favorite status");
      },
      onSettled: () => {
        // Invalidate for consistency
        queryClient.invalidateQueries({
          queryKey: getGetBoardsForUserQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
      },
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite({ boardId });
  };

  const buttonSize = showLabel ? "default" : size;

  return (
    <Button
      variant={variant}
      size={buttonSize}
      onClick={handleClick}
      disabled={isPending}
      className={cn("shrink-0", className)}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "h-4 w-4",
          isFavorite && "fill-yellow-400 text-yellow-400",
        )}
      />
      {showLabel && (isFavorite ? "Favorited" : "Favorite")}
    </Button>
  );
}
