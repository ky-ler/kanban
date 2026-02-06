import { useState } from "react";
import {
  ChevronRight,
  FolderKanban,
  LogIn,
  LogOut,
  Plus,
  Settings,
  User,
  UserPlus,
} from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";

import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { useGetBoardsForUser } from "@/api/gen/endpoints/board-controller/board-controller";
import { NewBoardDialog } from "@/features/boards/components/new-board-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Boards",
    url: "/boards",
    icon: FolderKanban,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const auth = useAuth0Context();
  const { isMobile } = useSidebar();
  const params = useParams({ strict: false });
  const { data: boards } = useGetBoardsForUser({
    query: { enabled: auth.isAuthenticated },
  });
  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);

  const currentBoardId = params.boardId as string | undefined;
  const favoriteBoards = (boards?.data.filter((b) => b.isFavorite) ?? []).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  return (
    <Sidebar {...props}>
      {auth.isAuthenticated && (
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setIsNewBoardOpen(true)}>
                <Plus className="size-4" />
                <span>New Board</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      )}

      <SidebarContent className="gap-0">
        {auth.isAuthenticated ? (
          <>
            {/* Favorites Section */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                >
                  <CollapsibleTrigger>
                    Favorites
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {favoriteBoards.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-1.5 text-xs">
                          Star boards for quick access
                        </p>
                      ) : (
                        favoriteBoards.map((board) => (
                          <SidebarMenuItem key={board.id}>
                            <SidebarMenuButton
                              asChild
                              isActive={board.id === currentBoardId}
                            >
                              <Link
                                to="/boards/$boardId"
                                params={{ boardId: board.id }}
                                search={{
                                  q: undefined,
                                  assignee: undefined,
                                  priority: undefined,
                                  labels: undefined,
                                  due: undefined,
                                }}
                              >
                                {/* TODO: replace icon, maybe indent instead */}
                                {/* <FolderKanban className="size-4" /> */}
                                <span>{board.name}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Navigation Section */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                >
                  <CollapsibleTrigger>
                    Navigation
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <Link to={item.url}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </>
        ) : (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => auth.loginWithRedirect()}>
                  <LogIn className="size-4" />
                  <span>Log In</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    {auth.user?.picture ? (
                      <img
                        src={auth.user.picture}
                        referrerPolicy="no-referrer"
                        alt="Profile"
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <User className="size-4" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {auth.user?.username || auth.user?.nickname || "Guest"}
                    </span>
                    <span className="truncate text-xs">
                      {auth.user?.email || "Not logged in"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width)"
                align="center"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                {auth.isAuthenticated ? (
                  <DropdownMenuItem onClick={() => auth.logout()}>
                    <LogOut className="mr-2 size-4" />
                    Sign Out
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => auth.loginWithRedirect()}>
                      <LogIn className="mr-2 size-4" />
                      Log In
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        auth.loginWithRedirect({
                          authorizationParams: { screen_hint: "signup" },
                        })
                      }
                    >
                      <UserPlus className="mr-2 size-4" />
                      Sign Up
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      {/* Controlled dialog - rendered outside any dropdown */}
      <NewBoardDialog open={isNewBoardOpen} onOpenChange={setIsNewBoardOpen} />
    </Sidebar>
  );
}
