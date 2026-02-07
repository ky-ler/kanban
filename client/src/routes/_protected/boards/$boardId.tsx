import { useState, useEffect, useRef } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InlineSaveActions } from "@/components/inline-save-actions";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { Check, Pencil, Users, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { BoardWebSocketProvider } from "@/features/boards/context/board-websocket-context";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";

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

type EditingField = "name" | "description" | null;

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

  const saveField = (field: "name" | "description", value: string) => {
    if (!board) return;

    if (field === "name" && !value.trim()) {
      setEditingField(null);
      return;
    }

    updateBoardMutation.mutate({
      boardId,
      data: {
        name: field === "name" ? value.trim() : board.data.name,
        description: field === "description" ? value : board.data.description,
        isArchived: board.data.isArchived,
      },
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
          <EditableBoardName
            value={board.data.name}
            isEditing={editingField === "name"}
            canEdit={isAdmin}
            onEdit={() => {
              setEditValue(board.data.name);
              setEditingField("name");
            }}
            onSave={(value) => saveField("name", value)}
            onCancel={() => setEditingField(null)}
            editValue={editValue}
            setEditValue={setEditValue}
          />
          <div className="hidden sm:block">
            <EditableBoardDescription
              value={board.data.description ?? ""}
              isEditing={editingField === "description"}
              canEdit={isAdmin}
              onEdit={() => {
                setEditValue(board.data.description ?? "");
                setEditingField("description");
              }}
              onSave={(value) => saveField("description", value)}
              onCancel={() => setEditingField(null)}
              editValue={editValue}
              setEditValue={setEditValue}
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-1 sm:gap-2">
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
      <div className="px-4">
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

function EditableBoardName({
  value,
  isEditing,
  canEdit,
  onEdit,
  onSave,
  onCancel,
  editValue,
  setEditValue,
}: {
  value: string;
  isEditing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  editValue: string;
  setEditValue: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(editValue);
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
          className="h-auto py-1 text-xl font-bold tracking-tight sm:text-3xl"
        />
        <Button size="icon" variant="ghost" onClick={() => onSave(editValue)}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <h1
      className={cn(
        "text-xl font-bold tracking-tight sm:text-3xl",
        canEdit && "hover:text-primary group cursor-pointer transition-colors",
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value}
      {canEdit && (
        <Pencil className="ml-2 inline h-4 w-4 opacity-0 transition-opacity group-hover:opacity-50" />
      )}
    </h1>
  );
}

function EditableBoardDescription({
  value,
  isEditing,
  canEdit,
  onEdit,
  onSave,
  onCancel,
  editValue,
  setEditValue,
}: {
  value: string;
  isEditing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  editValue: string;
  setEditValue: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="mt-2 space-y-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isPrimaryModifierPressed(e)) {
              e.preventDefault();
              onSave(editValue);
              return;
            }

            if (e.key === "Escape") {
              onCancel();
            }
          }}
          rows={3}
          placeholder="Add a description..."
          className="resize-none"
        />
        <InlineSaveActions
          onCancel={onCancel}
          onSave={() => onSave(editValue)}
        />
      </div>
    );
  }

  return (
    <p
      className={cn(
        "text-muted-foreground",
        canEdit &&
          "hover:text-foreground group cursor-pointer transition-colors",
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value ||
        (canEdit ? "Click to add a description..." : "No description yet")}
      {canEdit && value && (
        <Pencil className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
      )}
    </p>
  );
}
