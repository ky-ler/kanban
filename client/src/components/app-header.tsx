import { useState } from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  IconLayoutKanban,
  IconLogin,
  IconLogout,
  IconPlus,
  IconUserPlus,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { NewBoardDialog } from "@/features/boards/components/new-board-dialog";
import { cn } from "@/lib/utils";

type NavLink = {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  search?: Record<string, string | undefined>;
};

const navLinks = [
  {
    to: "/boards",
    label: "Boards",
    // icon: IconLayoutKanban,
    search: {
      archive: undefined,
    },
  },
] as NavLink[];

export function AppHeader() {
  const auth = useAuth0Context();
  const matchRoute = useMatchRoute();
  const [newBoardOpen, setNewBoardOpen] = useState(false);

  const initials =
    auth.user?.nickname?.charAt(0).toUpperCase() ??
    auth.user?.email?.charAt(0).toUpperCase() ??
    "?";

  return (
    <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-12 items-center gap-4 px-4">
        {/* Logo */}
        <Link
          to="/boards"
          search={{ archive: undefined }}
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <IconLayoutKanban className="text-primary size-5" />
          <span className="text-sm">Kanban</span>
        </Link>

        {/* Nav Links */}
        {auth.isAuthenticated && (
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isOnBoardsRoute = matchRoute({ to: link.to, fuzzy: true });
              const isActive = isOnBoardsRoute;
              return (
                <Button
                  key={link.to}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(isActive && "bg-muted text-foreground")}
                >
                  <Link to={link.to} search={link.search}>
                    {link.icon && <link.icon className="size-3.5" />}
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        )}

        {/* Right Side */}
        <div className="ml-auto flex items-center gap-1.5">
          {auth.isAuthenticated && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setNewBoardOpen(true)}
            >
              <IconPlus className="size-3.5" />
              <span className="hidden sm:inline">New Board</span>
            </Button>
          )}

          <ThemeToggle />

          {auth.isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                >
                  <Avatar size="sm">
                    {auth.user?.picture && (
                      <AvatarImage
                        src={auth.user.picture}
                        alt={auth.user?.nickname ?? "User"}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {auth.user?.nickname ?? "User"}
                  </p>
                  <p className="text-muted-foreground truncate">
                    {auth.user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => auth.logout()}>
                  <IconLogout className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => auth.loginWithRedirect()}
              >
                <IconLogin className="size-3.5" />
                Sign In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  auth.loginWithRedirect({
                    authorizationParams: { screen_hint: "signup" },
                  })
                }
              >
                <IconUserPlus className="size-3.5" />
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      <NewBoardDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} />
    </header>
  );
}
