import { useState, useEffect, useRef } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Check, Pencil, Users, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
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

// Wrapper to provide WebSocket context for the board route
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

  // Inline editing state
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState("");

  // Subscribe to real-time board events
  useBoardSubscription(boardId);

  // Parse filters from URL search params
  const filters = parseFiltersFromSearch(search);

  // Local state for search input (for debouncing)
  const [searchInput, setSearchInput] = useState(filters.query ?? "");

  // Sync searchInput with URL when navigating back/forward
  useEffect(() => {
    setSearchInput(filters.query ?? "");
  }, [filters.query]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: TaskFilters) => {
    const searchParams = filtersToSearchParams(newFilters);
    navigate({
      to: ".",
      search: searchParams,
      replace: true,
    });
  };

  // Debounce URL update for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.query ?? "")) {
        navigate({
          to: ".",
          search: filtersToSearchParams({ ...filters, query: searchInput || undefined }),
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, navigate]);

  // Check if current user is admin
  const currentUserId = auth?.user?.sub;
  const currentUserRole = board?.data.collaborators.find(
    (collaborator) => collaborator.user?.id.toString() === currentUserId,
  )?.role;
  const isAdmin = currentUserRole === CollaboratorDtoRole.ADMIN;

  // Update board mutation
  const updateBoardMutation = useUpdateBoard({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
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

    // Don't save if name is empty
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

  // Filter tasks based on active filters
  const filteredTasks = filterTasks(board.data.tasks ?? [], filters);

  return (
    <>
      {/* Board Info */}
      <div className="px-4 pt-6">
        <Card>
          <CardHeader className="flex flex-col items-center justify-between sm:flex-row">
            <div className="flex-1 min-w-0">
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
            <div className="flex flex-col gap-2 sm:flex-row mt-4 sm:mt-0 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={"/boards/$boardId/collaborators"}
                  params={{ boardId }}
                  search={{ q: undefined, assignee: undefined, priority: undefined, labels: undefined, due: undefined }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Collaborators
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

// Editable Board Name Component
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
          className="text-2xl font-bold h-auto py-1"
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
    <CardTitle
      className={cn(
        "text-2xl font-bold",
        canEdit && "cursor-pointer hover:text-primary transition-colors group",
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value}
      {canEdit && (
        <Pencil className="ml-2 inline h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </CardTitle>
  );
}

// Editable Board Description Component
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
            if (e.key === "Escape") {
              onCancel();
            }
          }}
          rows={3}
          placeholder="Add a description..."
          className="resize-none"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(editValue)}>
            <Check className="mr-1 h-3 w-3" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CardDescription
      className={cn(
        canEdit && "cursor-pointer hover:text-foreground transition-colors group",
      )}
      onClick={canEdit ? onEdit : undefined}
    >
      {value || (canEdit ? "Click to add a description..." : "No description provided")}
      {canEdit && value && (
        <Pencil className="ml-1 inline h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </CardDescription>
  );
}
