import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EditableTitleText } from "@/components/editable-title-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  IconAlignLeft,
  IconArchive,
  IconDotsVertical,
  IconRestore,
  IconCalendar as IconCalendarIcon,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconColumns3,
  IconMessage,
  IconFlag,
  IconTag,
  IconUser,
} from "@tabler/icons-react";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isValid, parseISO } from "date-fns";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import {
  getGetTaskQueryKey,
  getGetTaskQueryOptions,
  useGetTaskSuspense,
  useUpdateTask,
  useUpdateTaskStatus,
} from "@/api/gen/endpoints/task-controller/task-controller";
import {
  UpdateTaskBody,
  UpdateTaskStatusBody,
  updateTaskBodyTitleMax,
  updateTaskBodyTitleMin,
} from "@/api/gen/endpoints/task-controller/task-controller.zod";
import {
  getTaskActivity,
  getGetTaskActivityQueryKey,
  getGetTaskActivityInfiniteQueryKey,
} from "@/api/gen/endpoints/activity-log-controller/activity-log-controller";
import { getGetBoardActivityQueryKey } from "@/api/gen/endpoints/board-activity-controller/board-activity-controller";
import {
  getGetTaskCommentsQueryKey,
  getGetTaskCommentsQueryOptions,
} from "@/api/gen/endpoints/comment-controller/comment-controller";
import { LoadingSpinner } from "@/components/loading-spinner";
import { formatDate } from "@/lib/format-date";
import { LabelPicker } from "@/features/labels/components/label-picker";
import { ActivityFeed } from "@/features/tasks/components/activity-feed";
import { ChecklistSection } from "@/features/tasks/components/checklist-section";
import { TaskDescriptionEditor } from "@/features/tasks/components/task-description-editor";
import { TaskDescriptionView } from "@/features/tasks/components/task-description-view";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";
import { InlineSaveActions } from "@/components/inline-save-actions";
import { useBoardSubscription } from "@/features/boards/hooks/use-board-subscription";
import { BoardEventType } from "@/features/boards/constants/board-event-type";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { PRIORITY_OPTIONS } from "@/features/tasks/constants/priorities";
import { PriorityAntennaIcon } from "@/features/tasks/components/priority-antenna-icon";
import {
  handleMutationAuthError,
  rethrowProtectedRouteError,
} from "@/features/auth/route-auth";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";
import { z } from "zod";
import { getGetChecklistItemsQueryOptions } from "@/api/gen/endpoints/checklist-item-controller/checklist-item-controller";
import { getGetChecklistItemsQueryKey } from "@/api/gen/endpoints/checklist-item-controller/checklist-item-controller";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_protected/boards/$boardId/tasks/$taskId",
)({
  loader: async ({
    context: { queryClient },
    params: { boardId, taskId },
    location,
  }) => {
    try {
      return await Promise.all([
        queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
        queryClient.ensureQueryData(getGetTaskQueryOptions(taskId)),
        queryClient.prefetchInfiniteQuery({
          queryKey: [
            ...getGetTaskActivityQueryKey(boardId, taskId),
            "infinite",
          ],
          queryFn: ({ signal }) =>
            getTaskActivity(boardId, taskId, { page: 0 }, { signal }),
          initialPageParam: 0,
        }),
        queryClient.ensureQueryData(
          getGetTaskCommentsQueryOptions(boardId, taskId),
        ),
        queryClient.ensureQueryData(
          getGetChecklistItemsQueryOptions(boardId, taskId),
        ),
      ]);
    } catch (error) {
      rethrowProtectedRouteError(
        error,
        `${location.pathname}${location.searchStr}${location.hash}`,
      );
    }
  },
  component: TaskComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: `View and edit details for task ${loaderData?.[1].data.title}.`,
      },
      {
        title: `Task Details - ${loaderData?.[1].data.title} - Velora`,
      },
    ],
  }),
});

type EditingField = "title" | "description" | null;

type SaveFieldOptions = {
  closeEditor?: boolean;
};

const taskTitleSchema = z
  .string()
  .trim()
  .min(
    updateTaskBodyTitleMin,
    `Task title must be between ${updateTaskBodyTitleMin} and ${updateTaskBodyTitleMax} characters`,
  )
  .max(
    updateTaskBodyTitleMax,
    `Task title must be between ${updateTaskBodyTitleMin} and ${updateTaskBodyTitleMax} characters`,
  );

function TaskComponent() {
  const navigate = useNavigate();
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isMobileActivityOpen, setIsMobileActivityOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [popoverContainer, setPopoverContainer] =
    useState<HTMLDivElement | null>(null);

  const queryClient = useQueryClient();
  const { boardId, taskId } = Route.useParams();
  const auth = useAuth0Context();
  const currentUserId = auth?.user?.sub;

  const { data: board, isLoading: boardIsLoading } =
    useGetBoardSuspense(boardId);
  const { data: task, isLoading: taskIsLoading } = useGetTaskSuspense(taskId);

  // Subscribe to WebSocket events to refresh activity and comments on changes
  useBoardSubscription(boardId, {
    onEvent: (event) => {
      if (event.type === BoardEventType.ACTIVITY_LOGGED) {
        if (event.entityId === taskId) {
          queryClient.invalidateQueries({
            queryKey: getGetTaskActivityInfiniteQueryKey(boardId, taskId),
          });
        }
        queryClient.invalidateQueries({
          queryKey: getGetBoardActivityQueryKey(boardId),
        });
      }
      // Handle comment events - also invalidate task to refresh version
      if (
        event.type === BoardEventType.COMMENT_ADDED ||
        event.type === BoardEventType.COMMENT_UPDATED ||
        event.type === BoardEventType.COMMENT_DELETED
      ) {
        queryClient.invalidateQueries({
          queryKey: getGetTaskCommentsQueryKey(boardId, taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      }
      // Handle task updates - refresh task data in modal
      if (
        event.type === BoardEventType.TASK_UPDATED &&
        event.entityId === taskId
      ) {
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskActivityInfiniteQueryKey(boardId, taskId),
        });
      }

      if (
        event.type === BoardEventType.CHECKLIST_ITEM_ADDED ||
        event.type === BoardEventType.CHECKLIST_ITEM_UPDATED ||
        event.type === BoardEventType.CHECKLIST_ITEM_DELETED ||
        event.type === BoardEventType.CHECKLIST_ITEM_REORDERED
      ) {
        queryClient.invalidateQueries({
          queryKey: getGetChecklistItemsQueryKey(boardId, taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      }
    },
  });

  const mentionUsers = useMemo<MentionUser[]>(() => {
    return (
      board?.data?.collaborators?.flatMap((collaborator) => {
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
  }, [board?.data?.collaborators]);

  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to update task");
      },
    },
  });
  const updateTaskStatusMutation = useUpdateTaskStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskActivityQueryKey(boardId, taskId),
        });
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to update task status");
      },
    },
  });

  const saveField = (
    field: string,
    value: string | string[] | undefined,
    options: SaveFieldOptions = {},
  ) => {
    const { closeEditor = true } = options;

    if (!task) return;

    const data = {
      boardId,
      title: task.data.title,
      columnId: task.data.columnId,
      isCompleted: task.data.isCompleted,
      isArchived: task.data.isArchived,
      description: task.data.description ?? undefined,
      assigneeId: task.data.assignedTo?.id ?? undefined,
      priority: task.data.priority ?? undefined,
      dueDate: task.data.dueDate ?? undefined,
      labelIds: task.data.labels?.map((l) => l.id) ?? [],
    };

    // Update the specific field
    switch (field) {
      case "title":
        if (typeof value === "string" && value.trim()) {
          data.title = value.trim();
        }
        break;
      case "assignee":
        data.assigneeId = value as string | undefined;
        break;
      case "priority":
        data.priority = value as string | undefined;
        break;
      case "dueDate":
        data.dueDate = value as string | undefined;
        break;
      case "column":
        if (typeof value === "string") {
          data.columnId = value;
        }
        break;
      case "labels":
        if (Array.isArray(value)) {
          data.labelIds = value;
        }
        break;
      case "description":
        data.description = value as string | undefined;
        break;
    }

    const validationResult = UpdateTaskBody.safeParse(data);
    if (!validationResult.success) {
      toast.error(
        validationResult.error.issues[0]?.message ?? "Invalid task update",
      );
      return;
    }

    updateTaskMutation.mutate({ taskId, data });
    if (closeEditor) {
      setEditingField(null);
    }
  };

  const updateStatus = (statusPatch: {
    isCompleted?: boolean;
    isArchived?: boolean;
  }) => {
    const validationResult = UpdateTaskStatusBody.safeParse(statusPatch);
    if (!validationResult.success) {
      toast.error(
        validationResult.error.issues[0]?.message ?? "Invalid task status",
      );
      return;
    }

    updateTaskStatusMutation.mutate({ taskId, data: statusPatch });
  };

  const returnToBoard = (open: boolean) => {
    if (!open) {
      navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: {
          q: undefined,
          assignee: undefined,
          priority: undefined,
          labels: undefined,
          due: undefined,
          archive: undefined,
        },
      });
    }
  };

  if (!board || !task || boardIsLoading || taskIsLoading) {
    return <LoadingSpinner />;
  }

  const isBoardArchived = board.data.isArchived;
  const activeColumns = (board.data.columns ?? []).filter(
    (col) => !col.isArchived,
  );
  const currentColumn = (board.data.columns ?? []).find(
    (col) => col.id === task.data.columnId,
  );
  const isParentColumnArchived = currentColumn?.isArchived ?? false;
  const archiveStatusReason = isBoardArchived
    ? "Unarchive the board before changing task archive state."
    : task.data.isArchived && isParentColumnArchived
      ? "Restore the parent column before restoring this task."
      : undefined;

  return (
    <>
      <Dialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive this task?</DialogTitle>
            <DialogDescription>
              This will archive the task. You can restore it from the board's
              archive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmArchiveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updateTaskStatusMutation.isPending}
              onClick={() => {
                setConfirmArchiveOpen(false);
                updateStatus({ isArchived: true });
              }}
            >
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={true}
        modal={true}
        onOpenChange={returnToBoard}
        key={`task-${taskId}`}
      >
        <DialogContent
          className="flex h-[80vh] max-h-[700px] flex-col gap-0 p-0 sm:max-w-5xl"
          onEscapeKeyDown={(event) => {
            const activeElement = document.activeElement as HTMLElement | null;
            const isRichTextFocused = Boolean(
              activeElement?.closest('[contenteditable="true"]'),
            );

            if (isRichTextFocused) {
              event.preventDefault();
              setEditingField(null);
            }
          }}
        >
          <div ref={setPopoverContainer} className="contents" />
          <DialogDescription className="sr-only">
            Detailed view and editing options for the task.
          </DialogDescription>
          {/* Header */}
          <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <div className="mr-6 flex items-start gap-2">
              <div className="flex h-full shrink-0 items-center justify-center">
                <Checkbox
                  aria-label={
                    task.data.isCompleted ? "Mark incomplete" : "Mark complete"
                  }
                  checked={task.data.isCompleted}
                  disabled={
                    updateTaskStatusMutation.isPending || task.data.isArchived
                  }
                  onCheckedChange={(checked) =>
                    updateStatus({ isCompleted: checked === true })
                  }
                  className="disabled:cursor-pointer"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col truncate text-ellipsis">
                <EditableTitleText
                  variant="task"
                  value={task.data.title}
                  canEdit={!task.data.isArchived}
                  isEditing={editingField === "title"}
                  onEdit={() => {
                    setEditValue(task.data.title);
                    setEditingField("title");
                  }}
                  onSave={(value) => saveField("title", value)}
                  onCancel={() => setEditingField(null)}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  validate={(rawTitle) => {
                    const result = taskTitleSchema.safeParse(rawTitle);
                    if (result.success) {
                      return null;
                    }

                    return (
                      result.error.issues[0]?.message ??
                      `Task title must be between ${updateTaskBodyTitleMin} and ${updateTaskBodyTitleMax} characters`
                    );
                  }}
                  ViewComponent={DialogTitle}
                />
              </div>
            </div>
            <TaskActionsMenu
              isArchived={task.data.isArchived}
              isPending={updateTaskStatusMutation.isPending}
              canToggleArchived={!archiveStatusReason}
              helperText={archiveStatusReason}
              onArchive={() => setConfirmArchiveOpen(true)}
              onUnarchive={() => updateStatus({ isArchived: false })}
              container={popoverContainer}
            />
          </DialogHeader>

          {/* Main content area */}
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <ScrollArea className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Left side - Main content */}
              <div className="min-w-0 flex-1 p-6">
                <div className="space-y-6">
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Assignee */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <IconUser className="text-muted-foreground" />
                        <span className="text-muted-foreground text-sm font-medium">
                          Assignee
                        </span>
                      </div>
                      <Select
                        value={task.data.assignedTo?.id ?? "__none__"}
                        onValueChange={(v) =>
                          saveField(
                            "assignee",
                            v === "__none__" ? undefined : v,
                          )
                        }
                        disabled={task.data.isArchived || isBoardArchived}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {board?.data?.collaborators?.map((c) => (
                            <SelectItem
                              key={c?.user?.id ?? "__none__"}
                              value={c?.user?.id ?? "__none__"}
                            >
                              {c?.user?.username ?? ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Column */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <IconColumns3 className="text-muted-foreground" />
                        <span className="text-muted-foreground text-sm font-medium">
                          Column
                        </span>
                      </div>
                      <Select
                        value={task.data.columnId}
                        onValueChange={(v) => saveField("column", v)}
                        disabled={task.data.isArchived || isBoardArchived}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activeColumns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <IconCalendarIcon className="text-muted-foreground" />
                        <span className="text-muted-foreground text-sm font-medium">
                          Due Date
                        </span>
                      </div>
                      <DatePickerField
                        value={task.data.dueDate ?? undefined}
                        onSave={(v) => saveField("dueDate", v)}
                        disabled={task.data.isArchived || isBoardArchived}
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <IconFlag className="text-muted-foreground" />
                        <span className="text-muted-foreground text-sm font-medium">
                          Priority
                        </span>
                      </div>
                      <Select
                        value={task.data.priority ?? "__none__"}
                        onValueChange={(v) =>
                          saveField(
                            "priority",
                            v === "__none__" ? undefined : v,
                          )
                        }
                        disabled={task.data.isArchived || isBoardArchived}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <PriorityAntennaIcon priority={null} />
                            None
                          </SelectItem>
                          {PRIORITY_OPTIONS.map((priorityOption) => (
                            <SelectItem
                              key={priorityOption.value}
                              value={priorityOption.value}
                            >
                              <PriorityAntennaIcon
                                priority={priorityOption.value}
                              />
                              {priorityOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <IconTag className="text-muted-foreground h-4 w-4" />
                      <h3 className="text-muted-foreground font-medium">
                        Labels
                      </h3>
                    </div>
                    <LabelPicker
                      boardId={boardId}
                      selectedLabelIds={
                        task.data.labels?.map((l) => l.id) ?? []
                      }
                      selectedBadgeSize="md"
                      disabled={task.data.isArchived}
                      onChange={(nextSelectedIds) =>
                        saveField("labels", nextSelectedIds, {
                          closeEditor: false,
                        })
                      }
                    />
                  </div>

                  {/* Description */}
                  <EditableDescription
                    value={task.data.description ?? ""}
                    disabled={task.data.isArchived}
                    isEditing={editingField === "description"}
                    onEdit={() => {
                      setEditValue(task.data.description ?? "");
                      setEditingField("description");
                    }}
                    onSave={(value) =>
                      saveField("description", value || undefined)
                    }
                    onCancel={() => setEditingField(null)}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    mentionUsers={mentionUsers}
                    container={popoverContainer}
                  />

                  <ChecklistSection
                    boardId={boardId}
                    taskId={taskId}
                    collaborators={board?.data?.collaborators ?? []}
                    disabled={task.data.isArchived}
                  />

                  {/* Metadata */}
                  <Separator />
                  <div className="text-muted-foreground flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-1.5">
                      <IconUser className="h-3 w-3" />
                      <span>Created by {task.data.createdBy.username}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IconClock className="h-3 w-3" />
                      <span>{formatDate(task.data.dateCreated)}</span>
                    </div>
                  </div>

                  {/* Mobile comments/activity */}
                  {isMobileActivityOpen && (
                    <Card className="bg-muted/30 mt-3 md:hidden">
                      <CardContent>
                        <ActivityFeed
                          boardId={boardId}
                          taskId={taskId}
                          currentUserId={currentUserId}
                          mentionUsers={mentionUsers}
                          container={popoverContainer}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 border-t px-6 pt-3 pb-2 backdrop-blur md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() =>
                    setIsMobileActivityOpen((currentValue) => !currentValue)
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <IconMessage className="h-4 w-4" />
                    {isMobileActivityOpen
                      ? "Hide comments and activity"
                      : "Show comments and activity"}
                  </span>
                  {isMobileActivityOpen ? (
                    <IconChevronUp className="h-4 w-4" />
                  ) : (
                    <IconChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </ScrollArea>

            {/* Right side - Activity & Comments */}
            <div className="bg-muted/30 hidden shrink-0 flex-col border-t md:flex md:w-96 md:border-t-0 md:border-l">
              <div className="flex min-h-0 flex-1">
                <ScrollArea className="max-h-full min-h-0 flex-1">
                  <div className="p-4">
                    <ActivityFeed
                      boardId={boardId}
                      taskId={taskId}
                      currentUserId={currentUserId}
                      mentionUsers={mentionUsers}
                      container={popoverContainer}
                    />
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskActionsMenu({
  isArchived,
  isPending,
  canToggleArchived,
  helperText,
  onArchive,
  onUnarchive,
  container,
}: {
  isArchived: boolean;
  isPending: boolean;
  canToggleArchived: boolean;
  helperText?: string;
  onArchive: () => void;
  onUnarchive: () => void;
  container?: HTMLDivElement | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-9"
        >
          <IconDotsVertical />
          <span className="sr-only">Task actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" container={container}>
        <DropdownMenuItem
          disabled={isPending || !canToggleArchived}
          onSelect={isArchived ? onUnarchive : onArchive}
          variant={isArchived ? undefined : "destructive"}
        >
          {isArchived ? <IconRestore /> : <IconArchive />}
          {isArchived ? "Unarchive" : "Archive"}
        </DropdownMenuItem>
        {helperText && !canToggleArchived ? (
          <p className="text-muted-foreground max-w-48 px-1.5 py-1 text-xs">
            {helperText}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DatePickerField({
  value,
  onSave,
  disabled = false,
}: {
  value: string | undefined;
  onSave: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start font-normal"
          disabled={disabled}
        >
          {selectedDate ? (
            format(selectedDate, "MMMM d, yyyy")
          ) : (
            <span className="text-muted-foreground">Not set</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onSave(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            disabled={!value}
            onClick={() => {
              onSave(undefined);
              setOpen(false);
            }}
          >
            Clear date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Editable Description Component
function EditableDescription({
  value,
  isEditing,
  disabled = false,
  onEdit,
  onSave,
  onCancel,
  editValue,
  setEditValue,
  mentionUsers,
  container,
}: {
  value: string;
  isEditing: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  editValue: string;
  setEditValue: (value: string) => void;
  mentionUsers: MentionUser[];
  container?: HTMLDivElement | null;
}) {
  const normalizeMarkdown = (rawValue: string): string =>
    rawValue.replace(/\r\n/g, "\n").trimEnd();

  const hasDescriptionChanges =
    normalizeMarkdown(editValue) !== normalizeMarkdown(value);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[contenteditable="true"]')) {
      return;
    }

    if (e.key === "Enter" && isPrimaryModifierPressed(e)) {
      e.preventDefault();
      if (hasDescriptionChanges) {
        onSave(editValue);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <IconAlignLeft className="text-muted-foreground h-4 w-4" />
        <h3 className="text-muted-foreground font-medium">Description</h3>
      </div>
      {isEditing ? (
        <div className="space-y-2" onKeyDownCapture={handleEditorKeyDown}>
          <TaskDescriptionEditor
            value={editValue}
            onChange={setEditValue}
            placeholder="Add a more detailed description..."
            mentionUsers={mentionUsers}
            container={container}
          />
          <InlineSaveActions
            onCancel={onCancel}
            onSave={() => onSave(editValue)}
            saveDisabled={!hasDescriptionChanges}
          />
        </div>
      ) : (
        <div
          className={cn(
            "border-input dark:bg-input/30 min-h-[100px] rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none",
            disabled
              ? "cursor-default"
              : "hover:border-ring/50 hover:bg-accent dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 cursor-pointer focus-visible:ring-3",
          )}
          role={disabled ? undefined : "button"}
          tabIndex={disabled ? undefined : 0}
          onClick={
            disabled
              ? undefined
              : (event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('a, [data-mention-trigger="true"]')) {
                    return;
                  }
                  onEdit();
                }
          }
          onKeyDown={
            disabled
              ? undefined
              : (event) => {
                  if (event.key !== "Enter" && event.key !== " ") {
                    return;
                  }

                  event.preventDefault();
                  onEdit();
                }
          }
        >
          <TaskDescriptionView
            value={value}
            mentionUsers={mentionUsers}
            container={container}
          />
        </div>
      )}
    </div>
  );
}
