import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { EditableTitleText } from "@/components/editable-title-text";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { Users } from "lucide-react";
import { FavoriteButton } from "@/features/boards/components/favorite-button";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  getGetBoardsForUserQueryKey,
  useGetBoardSuspense,
  useUpdateBoard,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { updateBoardBody } from "@/api/gen/endpoints/board-controller/board-controller.zod";
import { CollaboratorDtoRole } from "@/api/gen/model";
import { KanbanBoard } from "@/features/boards/components/kanban-board";
import { useBoardSubscription } from "@/features/boards/hooks/use-board-subscription";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { TaskFilterBar } from "@/features/boards/components/task-filter-bar";
import {
  filterTasks,
  parseFiltersFromSearch,
  filtersToSearchParams,
  type TaskFilters,
} from "@/features/boards/utils/filter-tasks";
import { BoardWebSocketProvider } from "@/features/boards/context/board-websocket-context";

function BoardRoute() {
  const { boardId } = Route.useParams();
  return (
    <BoardWebSocketProvider boardId={boardId}>
      <BoardComponent />
    </BoardWebSocketProvider>
  );
}

export const Route = createFileRoute("/_protected/boards/$boardId")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: search.q as string | undefined,
    assignee: search.assignee as string | undefined,
    priority: search.priority as string | undefined,
    labels: search.labels as string | undefined,
    due: search.due as string | undefined,
  }),
  loader: ({ context: { queryClient }, params: { boardId } }) =>
    queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
  component: BoardRoute,
});

type EditingField = "name" | null;

function BoardComponent() {
  const { boardId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuth0Context();
  const { data: board, isLoading, error } = useGetBoardSuspense(boardId);
  useBoardSubscription(boardId);
  const filters = parseFiltersFromSearch(search);
  const [searchInput, setSearchInput] = useState(filters.query ?? "");
  const [editValue, setEditValue] = useState("");
  const [editingField, setEditingField] = useState<EditingField>(null);

  useEffect(() => {
    setSearchInput(filters.query ?? "");
  }, [filters.query]);

  const handleFiltersChange = (newFilters: TaskFilters) => {
    const searchParams = filtersToSearchParams(newFilters);
    navigate({
      to: ".",
      search: searchParams,
      replace: true,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.query ?? "")) {
        navigate({
          to: ".",
          search: filtersToSearchParams({
            ...filters,
            query: searchInput || undefined,
          }),
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, navigate]);

  const currentUserId = auth?.user?.sub;
  const currentUserRole = board?.data.collaborators.find(
    (collaborator) => collaborator.user?.id.toString() === currentUserId,
  )?.role;
  const isAdmin = currentUserRole === CollaboratorDtoRole.ADMIN;
  const isBoardOwner = board?.data.createdBy.id === currentUserId;
  const canEditBoardMeta = isAdmin || isBoardOwner;

  const updateBoardMutation = useUpdateBoard({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetBoardsForUserQueryKey(),
        });
        setEditingField(null);
      },
      onError: () => {
        toast.error("Failed to update board");
      },
    },
  });

  const saveName = (value: string) => {
    if (!board) return;

    const payload = {
      name: value.trim(),
      description: board.data.description,
      isArchived: board.data.isArchived,
    };

    const validationResult = updateBoardBody.safeParse(payload);
    if (!validationResult.success) {
      toast.error(
        validationResult.error.issues[0]?.message ?? "Invalid board update",
      );
      return;
    }

    updateBoardMutation.mutate({
      boardId,
      data: payload,
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

  const filteredTasks = filterTasks(board.data.tasks ?? [], filters);

  return (
    <>
      {/* Board Info Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 sm:items-start sm:pt-4">
        <div className="min-w-0 flex-1">
          <EditableTitleText
            variant="board"
            value={board.data.name}
            isEditing={editingField === "name"}
            canEdit={canEditBoardMeta}
            onEdit={() => {
              setEditValue(board.data.name);
              setEditingField("name");
            }}
            onSave={saveName}
            onCancel={() => setEditingField(null)}
            editValue={editValue}
            setEditValue={setEditValue}
            ViewComponent="h1"
          />
        </div>
        <div className="flex h-full shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <TaskFilterBar
              boardId={boardId}
              collaborators={board.data.collaborators ?? []}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
            />
          </div>
          <FavoriteButton
            boardId={boardId}
            isFavorite={board.data.isFavorite}
            variant="outline"
          />
          <Button asChild variant="outline" size="icon">
            <Link
              to={"/boards/$boardId/collaborators"}
              params={{ boardId }}
              search={{
                q: undefined,
                assignee: undefined,
                priority: undefined,
                labels: undefined,
                due: undefined,
              }}
            >
              <Users className="h-4 w-4" />
              <span className="sr-only">Collaborators</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 md:hidden">
        <TaskFilterBar
          boardId={boardId}
          collaborators={board.data.collaborators ?? []}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
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
