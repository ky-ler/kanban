import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  // DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useGetBoardsForUser } from "@/api/gen/endpoints/board-controller/board-controller";
// import { NewBoardDialog } from "@/features/boards/components/new-board-dialog";

export function BoardSwitcher() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  // const { data: boards } = useQuery(boardsQueryOptions());
  const { data: boards } = useGetBoardsForUser();

  const currentBoardId = params.boardId as string | undefined;
  const currentBoard = boards?.data.find(
    (board) => board.id === currentBoardId,
  );

  if (!boards?.data) {
    return null;
  }

  return (
    boards?.data.length > 0 && (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FolderKanban className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {currentBoard?.name || "Select Board"}
                  </span>
                  <span className="truncate text-xs">
                    {currentBoard ? "Active Board" : "No board selected"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width)"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Boards
              </DropdownMenuLabel>
              {boards?.data.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => navigate({ to: `/boards/${board.id}` })}
                >
                  <FolderKanban className="size-4 shrink-0" />
                  {board.name}
                  {board.id === currentBoardId && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
              {/* TODO: add <NewBoardDialog /> */}
              {/* <DropdownMenuSeparator /> */}
              {/* New board dialog will not work properly */}
              {/* https://ui.shadcn.com/docs/components/dialog#notes */}
              {/* <NewBoardDialog
                trigger={
                  <DropdownMenuItem>
                    <Plus className="h-5 w-5" /> New Board
                  </DropdownMenuItem>
                }
              /> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  );
}
