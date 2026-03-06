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
import { Archive, EllipsisVertical, Info, Users } from "lucide-react";
import { FavoriteButton } from "@/features/boards/components/favorite-button";
import { Alert } from "@/components/ui/alert";
import { BoardWebSocketBanner } from "@/features/boards/components/board-websocket-banner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownEditor } from "@/components/rich-text/markdown-editor";
import { MarkdownView } from "@/components/rich-text/markdown-view";
import { InlineSaveActions } from "@/components/inline-save-actions";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetArchivedBoardsForUserQueryKey,
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  getGetBoardsForUserQueryKey,
  useGetBoardSuspense,
  useUpdateBoard,
  useUpdateBoardArchive,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { updateBoardBody } from "@/api/gen/endpoints/board-controller/board-controller.zod";
import { CollaboratorDtoRole } from "@/api/gen/model";
import { KanbanBoard } from "@/features/boards/components/kanban-board";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import {
  handleMutationAuthError,
  rethrowProtectedRouteError,
} from "@/features/auth/route-auth";
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
  loader: async ({
    context: { queryClient },
    params: { boardId },
    location,
  }) => {
    try {
      await queryClient.ensureQueryData(getGetBoardQueryOptions(boardId));
    } catch (error) {
      rethrowProtectedRouteError(
        error,
        `${location.pathname}${location.searchStr}${location.hash}`,
      );
    }
  },
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
  const filters = parseFiltersFromSearch(search);
  const [searchInput, setSearchInput] = useState(filters.query ?? "");
  const [editValue, setEditValue] = useState("");
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionEditValue, setDescriptionEditValue] = useState("");

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
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to update board");
      },
    },
  });

  const { mutate: archiveBoard, isPending: isArchiving } =
    useUpdateBoardArchive({
      mutation: {
        onSuccess: () => {
          toast.success("Board archived");
          queryClient.invalidateQueries({
            queryKey: getGetBoardsForUserQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetArchivedBoardsForUserQueryKey(),
          });
          navigate({ to: "/boards" });
        },
        onError: (error) => {
          if (handleMutationAuthError(error)) {
            return;
          }
          toast.error("Failed to archive board");
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
      <BoardWebSocketBanner />

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
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <EllipsisVertical className="h-4 w-4" />
                  <span className="sr-only">Board actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setAboutOpen(true)}>
                  <Info className="h-4 w-4" />
                  About This Board
                </DropdownMenuItem>
                {isBoardOwner && (
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem variant="destructive">
                      <Archive className="h-4 w-4" />
                      Archive Board
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive this board?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive the board and all its tasks. You can restore
                  it from the Archive page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  disabled={isArchiving}
                  onClick={() =>
                    archiveBoard({
                      boardId,
                      data: {
                        isArchived: true,
                        confirmArchiveTasks: true,
                      },
                    })
                  }
                >
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

      {/* About This Board Dialog */}
      <Dialog
        open={aboutOpen}
        onOpenChange={(open) => {
          setAboutOpen(open);
          if (!open) {
            setIsEditingDescription(false);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>About This Board</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {canEditBoardMeta && isEditingDescription ? (
              <div
                className="space-y-2"
                onKeyDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest('[contenteditable="true"]')) return;
                  if (e.key === "Enter" && isPrimaryModifierPressed(e)) {
                    e.preventDefault();
                    if (!board) return;
                    const payload = {
                      name: board.data.name,
                      description: descriptionEditValue.trim() || undefined,
                      isArchived: board.data.isArchived,
                    };
                    const validationResult = updateBoardBody.safeParse(payload);
                    if (!validationResult.success) {
                      toast.error(
                        validationResult.error.issues[0]?.message ??
                          "Invalid board update",
                      );
                      return;
                    }
                    updateBoardMutation.mutate({
                      boardId,
                      data: payload,
                    });
                    setIsEditingDescription(false);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setIsEditingDescription(false);
                  }
                }}
              >
                <MarkdownEditor
                  value={descriptionEditValue}
                  onChange={setDescriptionEditValue}
                  toolbarVariant="full"
                  autoFocus
                  placeholder="Add a board description..."
                  minHeightClassName="min-h-[120px]"
                />
                <InlineSaveActions
                  onSave={() => {
                    if (!board) return;
                    const payload = {
                      name: board.data.name,
                      description: descriptionEditValue.trim() || undefined,
                      isArchived: board.data.isArchived,
                    };
                    const validationResult = updateBoardBody.safeParse(payload);
                    if (!validationResult.success) {
                      toast.error(
                        validationResult.error.issues[0]?.message ??
                          "Invalid board update",
                      );
                      return;
                    }
                    updateBoardMutation.mutate({
                      boardId,
                      data: payload,
                    });
                    setIsEditingDescription(false);
                  }}
                  onCancel={() => setIsEditingDescription(false)}
                  isSaving={updateBoardMutation.isPending}
                />
              </div>
            ) : canEditBoardMeta ? (
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "rounded-lg border border-transparent px-3 py-2 text-sm transition-colors",
                  "bg-muted/30 hover:bg-muted/50 hover:border-border cursor-pointer",
                )}
                onClick={() => {
                  setDescriptionEditValue(board?.data.description ?? "");
                  setIsEditingDescription(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    setDescriptionEditValue(board?.data.description ?? "");
                    setIsEditingDescription(true);
                  }
                }}
              >
                <MarkdownView
                  value={board?.data.description ?? ""}
                  emptyState={
                    <p className="text-muted-foreground italic">
                      Click to add a description...
                    </p>
                  }
                />
              </div>
            ) : (
              <div className="px-3 py-2 text-sm">
                <MarkdownView
                  value={board?.data.description ?? ""}
                  emptyState={
                    <p className="text-muted-foreground italic">
                      No description
                    </p>
                  }
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
