import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  IconLogin,
  IconLogout,
  IconMenu2,
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { NewBoardDialog } from "@/features/boards/components/new-board-dialog";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { cn } from "@/lib/utils";
import Logo from "@/assets/logo.svg?react";

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
  {
    to: "/tasks",
    label: "Tasks",
    // icon: IconChecklist,
  },
] as NavLink[];

export function AppHeader() {
  const auth = useAuth0Context();
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const isNavLinkActive = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`);

  const initials =
    auth.user?.nickname?.charAt(0).toUpperCase() ??
    auth.user?.email?.charAt(0).toUpperCase() ??
    "?";

  return (
    <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-12 items-center gap-4 px-4">
        {/* Mobile Menu Button */}
        {auth.isAuthenticated && (
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <IconMenu2 />
            <span className="sr-only">Open menu</span>
          </Button>
        )}

        {/* Logo */}
        <Link
          to="/"
          search={{ archive: undefined }}
          className="hover:text-primary hidden shrink-0 items-center gap-2 p-1 font-semibold tracking-tight transition-colors sm:flex"
        >
          {/* <IconLayoutKanban className="text-primary" /> */}
          <Logo className="size-5" />
          <span className="">Velora</span>
        </Link>

        {/* Nav Links */}
        {auth.isAuthenticated && (
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => {
              const isActive = isNavLinkActive(link.to);
              return (
                <Button
                  key={link.to}
                  asChild
                  variant="ghost"
                  size="default"
                  className={cn(isActive && "bg-muted text-foreground")}
                >
                  <Link to={link.to} search={link.search}>
                    {link.icon && <link.icon />}
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
              size="default"
              onClick={() => setNewBoardOpen(true)}
            >
              <IconPlus />
              <span className="hidden sm:inline">New Board</span>
            </Button>
          )}

          <ThemeToggle />

          {auth.isAuthenticated && <NotificationBell />}

          {auth.isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
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
                  <IconLogout />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="default"
                onClick={() => auth.loginWithRedirect()}
              >
                <IconLogin />
                Sign In
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() =>
                  auth.loginWithRedirect({
                    authorizationParams: { screen_hint: "signup" },
                  })
                }
              >
                <IconUserPlus />
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      {auth.isAuthenticated && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Logo className="size-5" />
                Velora
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {navLinks.map((link) => {
                const isActive = isNavLinkActive(link.to);
                return (
                  <SheetClose key={link.to} asChild>
                    <Link
                      to={link.to}
                      search={link.search}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        "hover:bg-muted",
                        isActive && "bg-muted text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
            <Separator className="my-4" />
            <div className="mt-auto px-4 pb-4">
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  {auth.user?.picture && (
                    <AvatarImage
                      src={auth.user.picture}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium">{auth.user?.nickname}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {auth.user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="default"
                className="mt-3 w-full justify-start"
                onClick={() => {
                  setMobileMenuOpen(false);
                  auth.logout();
                }}
              >
                <IconLogout />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <NewBoardDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} />
    </header>
  );
}
