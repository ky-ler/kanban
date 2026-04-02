import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { toast } from "sonner";
import {
  IconActivity,
  IconArchive,
  IconChevronRight,
  IconDotsVertical,
  IconHistory,
  IconInfoCircle,
  IconRestore,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { EditableTitleText } from "@/components/editable-title-text";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownEditor } from "@/components/rich-text/markdown-editor";
import { MarkdownView } from "@/components/rich-text/markdown-view";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";
import { InlineSaveActions } from "@/components/inline-save-actions";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import {
  getGetArchivedBoardsForUserQueryKey,
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  getGetBoardsForUserQueryKey,
  useGetBoardSuspense,
  useUpdateBoard,
  useUpdateBoardArchive,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { UpdateBoardBody } from "@/api/gen/endpoints/board-controller/board-controller.zod";
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
  filtersToSearchParams,
  parseFiltersFromSearch,
  type TaskFilters,
} from "@/features/boards/utils/filter-tasks";
import { BoardWebSocketProvider } from "@/features/boards/context/board-websocket-context";
import { BoardArchiveModal } from "@/features/boards/components/board-archive-modal";
import { useDeleteBoard } from "@/features/boards/hooks/use-delete-board";
import { FavoriteButton } from "@/features/boards/components/favorite-button";

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
    archive:
      search.archive === "tasks" || search.archive === "columns"
        ? search.archive
        : undefined,
  }),
  loader: async ({
    context: { queryClient },
    params: { boardId },
    location,
  }) => {
    try {
      return await queryClient.ensureQueryData(
        getGetBoardQueryOptions(boardId),
      );
    } catch (error) {
      rethrowProtectedRouteError(
        error,
        `${location.pathname}${location.searchStr}${location.hash}`,
      );
    }
  },
  component: BoardRoute,
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: `View and manage your kanban board: ${loaderData?.data.name}.`,
      },
      {
        title: `${loaderData?.data.name} - Kanban`,
      },
    ],
  }),
});

type EditingField = "name" | null;

function BoardComponent() {
  const { boardId } = Route.useParams();
  const search = Route.useSearch();
  const currentArchive =
    search.archive === "columns"
      ? "columns"
      : search.archive === "tasks"
        ? "tasks"
        : undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuth0Context();
  const { data: board, isLoading, error } = useGetBoardSuspense(boardId);
  const filters = parseFiltersFromSearch(search);
  const [searchInput, setSearchInput] = useState(filters.query ?? "");
  const [editValue, setEditValue] = useState("");
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [archiveBoardConfirmOpen, setArchiveBoardConfirmOpen] = useState(false);
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionEditValue, setDescriptionEditValue] = useState("");
  const [popoverContainer, setPopoverContainer] =
    useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setSearchInput(filters.query ?? "");
  }, [filters.query]);

  const updateRouteSearch = useCallback(
    (nextFilters: TaskFilters, archive: "tasks" | "columns" | undefined) => {
      navigate({
        to: ".",
        search: {
          ...filtersToSearchParams(nextFilters),
          archive,
        },
        replace: true,
      });
    },
    [navigate],
  );

  const handleFiltersChange = (newFilters: TaskFilters) => {
    updateRouteSearch(newFilters, currentArchive);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.query ?? "")) {
        updateRouteSearch(
          {
            ...filters,
            query: searchInput || undefined,
          },
          currentArchive,
        );
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentArchive, filters, searchInput, updateRouteSearch]);

  useEffect(() => {
    if (!board?.data.isArchived || !search.archive) {
      return;
    }

    updateRouteSearch(filters, undefined);
  }, [board?.data.isArchived, filters, search.archive, updateRouteSearch]);

  const openArchiveModal = (archive: "tasks" | "columns") => {
    updateRouteSearch(filters, archive);
  };

  const closeArchiveModal = () => {
    updateRouteSearch(filters, undefined);
  };

  const currentUserId = auth?.user?.sub;
  const currentUserRole = board?.data.collaborators.find(
    (collaborator) => collaborator.user?.id.toString() === currentUserId,
  )?.role;
  const isAdmin = currentUserRole === CollaboratorDtoRole.ADMIN;
  const isBoardOwner = board?.data.createdBy.id === currentUserId;
  const isBoardArchived = board?.data.isArchived ?? false;
  const canEditBoardMeta = isAdmin || isBoardOwner;
  const mentionUsers = useMemo<MentionUser[]>(() => {
    return (
      board?.data.collaborators?.flatMap((collaborator) => {
        if (!collaborator.user) {
          return [];
        }
        return [
          {
            id: collaborator.user.id,
            username: collaborator.user.username,
            profileImageUrl: collaborator.user.profileImageUrl,
            displayName: collaborator.user.username,
            role: collaborator.role,
          },
        ];
      }) ?? []
    );
  }, [board?.data.collaborators]);

  const updateBoardMutation = useUpdateBoard({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetBoardsForUserQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetArchivedBoardsForUserQueryKey(),
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

  const { mutate: updateBoardArchive, isPending: isUpdatingBoardArchive } =
    useUpdateBoardArchive({
      mutation: {
        onSuccess: (_data, variables) => {
          queryClient.invalidateQueries({
            queryKey: getGetBoardQueryKey(boardId),
          });
          queryClient.invalidateQueries({
            queryKey: getGetBoardsForUserQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetArchivedBoardsForUserQueryKey(),
          });

          if (variables.data.isArchived) {
            toast.success("Board archived");
            navigate({
              to: "/boards",
              search: { archive: undefined },
            });
            return;
          }

          toast.success("Board restored");
        },
        onError: (error) => {
          if (handleMutationAuthError(error)) {
            return;
          }
          toast.error("Failed to update board");
        },
      },
    });

  const deleteBoardMutation = useDeleteBoard();

  const saveName = (value: string) => {
    if (!board) return;

    const payload = {
      name: value.trim(),
      description: board.data.description,
      isArchived: board.data.isArchived,
    };

    const validationResult = UpdateBoardBody.safeParse(payload);
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

  const handleDeleteBoard = async () => {
    try {
      await deleteBoardMutation.mutateAsync(boardId);
      toast.success("Board deleted");
      queryClient.invalidateQueries({
        queryKey: getGetBoardsForUserQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetArchivedBoardsForUserQueryKey(),
      });
      navigate({
        to: "/boards",
        search: { archive: undefined },
      });
    } catch (error) {
      if (handleMutationAuthError(error)) {
        return;
      }
      toast.error("Failed to delete board");
    }
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

  const activeColumns = (board.data.columns ?? []).filter(
    (column) => !column.isArchived,
  );
  const activeColumnIds = new Set(activeColumns.map((column) => column.id));
  const filteredTasks = filterTasks(board.data.tasks ?? [], filters).filter(
    (task) => !task.isArchived && activeColumnIds.has(task.columnId),
  );
  const archiveModalOpen =
    !isBoardArchived &&
    (search.archive === "tasks" || search.archive === "columns");

  return (
    <>
      <BoardWebSocketBanner />

      <div className="bg-background/50 border-b">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link
              to="/boards"
              search={{ archive: undefined }}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              Boards
            </Link>
            <IconChevronRight className="text-muted-foreground size-3 shrink-0" />
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
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isBoardArchived ? (
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
            ) : null}
            <FavoriteButton
              boardId={boardId}
              isFavorite={board.data.isFavorite}
              variant="ghost"
            />
            <Button asChild variant="ghost" size="icon">
              <Link
                to={"/boards/$boardId/collaborators"}
                params={{ boardId }}
                search={{
                  q: undefined,
                  assignee: undefined,
                  priority: undefined,
                  labels: undefined,
                  due: undefined,
                  archive: undefined,
                }}
              >
                <IconUsers />
                <span className="sr-only">Collaborators</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <IconDotsVertical />
                  <span className="sr-only">Board actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem asChild>
                  <Link
                    to="/boards/$boardId/activity"
                    params={{ boardId }}
                    search={{
                      q: undefined,
                      assignee: undefined,
                      priority: undefined,
                      labels: undefined,
                      due: undefined,
                      archive: undefined,
                    }}
                  >
                    <IconActivity />
                    Activity
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setTimeout(() => setAboutOpen(true), 0)}
                >
                  <IconInfoCircle />
                  About This Board
                </DropdownMenuItem>
                {!isBoardArchived ? (
                  <DropdownMenuItem
                    onSelect={() =>
                      setTimeout(() => openArchiveModal("tasks"), 0)
                    }
                  >
                    <IconHistory />
                    Archived Items
                  </DropdownMenuItem>
                ) : null}
                {!isBoardArchived && isBoardOwner ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() =>
                        setTimeout(() => setArchiveBoardConfirmOpen(true), 0)
                      }
                    >
                      <IconArchive />
                      Archive Board
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isBoardArchived ? (
          <div className="px-4 pb-3">
            <Alert>
              <IconArchive />
              <AlertTitle>This board is closed</AlertTitle>
              <AlertDescription>
                Unarchive the board to continue working on columns and tasks.
              </AlertDescription>
              {isBoardOwner ? (
                <AlertAction className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingBoardArchive}
                    onClick={() =>
                      updateBoardArchive({
                        boardId,
                        data: {
                          isArchived: false,
                          confirmArchiveTasks: false,
                        },
                      })
                    }
                  >
                    <IconRestore data-icon="inline-start" />
                    Unarchive
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteBoardOpen(true)}
                  >
                    <IconTrash data-icon="inline-start" />
                    Delete
                  </Button>
                </AlertAction>
              ) : null}
            </Alert>
          </div>
        ) : (
          <div className="px-4 pb-2 md:hidden">
            <TaskFilterBar
              boardId={boardId}
              collaborators={board.data.collaborators ?? []}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              searchValue={searchInput}
              onSearchChange={setSearchInput}
            />
          </div>
        )}
      </div>

      {isBoardArchived ? (
        <div className="text-muted-foreground px-4 py-8 text-sm">
          This board is archived. Unarchive it to reopen the board.
        </div>
      ) : (
        <KanbanBoard
          columns={activeColumns}
          tasks={filteredTasks}
          boardId={boardId}
        />
      )}

      <Outlet />

      <BoardArchiveModal
        open={archiveModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeArchiveModal();
          }
        }}
        boardId={boardId}
        tab={currentArchive === "columns" ? "columns" : "tasks"}
        onTabChange={openArchiveModal}
        columns={board.data.columns ?? []}
        tasks={board.data.tasks ?? []}
      />

      <Dialog
        open={archiveBoardConfirmOpen}
        onOpenChange={setArchiveBoardConfirmOpen}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive this board?</DialogTitle>
            <DialogDescription>
              This will archive the board and all its tasks. You can restore it
              from the archived boards modal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setArchiveBoardConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isUpdatingBoardArchive}
              onClick={() => {
                setArchiveBoardConfirmOpen(false);
                updateBoardArchive({
                  boardId,
                  data: {
                    isArchived: true,
                    confirmArchiveTasks: true,
                  },
                });
              }}
            >
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteBoardOpen} onOpenChange={setDeleteBoardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this board permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{board.data.name}&quot; permanently. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteBoardMutation.isPending}
              onClick={handleDeleteBoard}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={aboutOpen}
        onOpenChange={(open) => {
          setAboutOpen(open);
          if (!open) {
            setIsEditingDescription(false);
          }
        }}
      >
        <DialogContent
          className="max-h-[80vh] overflow-y-auto sm:max-w-lg"
          onEscapeKeyDown={(event) => {
            const activeElement = document.activeElement as HTMLElement | null;
            const isRichTextFocused = Boolean(
              activeElement?.closest('[contenteditable="true"]'),
            );
            if (isEditingDescription && isRichTextFocused) {
              event.preventDefault();
              setIsEditingDescription(false);
            }
          }}
        >
          <div ref={setPopoverContainer} className="contents" />
          <DialogHeader>
            <DialogTitle>About This Board</DialogTitle>
            <DialogDescription className="sr-only">
              View and edit this board&apos;s details and description.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 min-w-0">
            {canEditBoardMeta && isEditingDescription ? (
              <div
                className="space-y-2"
                onKeyDownCapture={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest('[contenteditable="true"]')) return;
                  if (e.key === "Enter" && isPrimaryModifierPressed(e)) {
                    e.preventDefault();
                    const payload = {
                      name: board.data.name,
                      description: descriptionEditValue.trim() || undefined,
                      isArchived: board.data.isArchived,
                    };
                    const validationResult = UpdateBoardBody.safeParse(payload);
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
                    e.stopPropagation();
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
                  mentionUsers={mentionUsers}
                  container={popoverContainer}
                />
                <InlineSaveActions
                  onSave={() => {
                    const payload = {
                      name: board.data.name,
                      description: descriptionEditValue.trim() || undefined,
                      isArchived: board.data.isArchived,
                    };
                    const validationResult = UpdateBoardBody.safeParse(payload);
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
                  "rounded-lg border border-transparent px-3 py-2 transition-colors",
                  "bg-muted/30 hover:border-border hover:bg-accent cursor-pointer",
                )}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('a, [data-mention-trigger="true"]')) {
                    return;
                  }
                  setDescriptionEditValue(board.data.description ?? "");
                  setIsEditingDescription(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    setDescriptionEditValue(board.data.description ?? "");
                    setIsEditingDescription(true);
                  }
                }}
              >
                <MarkdownView
                  value={board.data.description ?? ""}
                  mentionUsers={mentionUsers}
                  container={popoverContainer}
                  emptyState={
                    <p className="text-muted-foreground italic">
                      Click to add a description...
                    </p>
                  }
                />
              </div>
            ) : (
              <div className="px-3 py-2">
                <MarkdownView
                  value={board.data.description ?? ""}
                  mentionUsers={mentionUsers}
                  container={popoverContainer}
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
