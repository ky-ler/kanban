import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { RouterContext } from "@/lib/router";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { ErrorPage } from "@/components/error-page";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <RootComponent />,
  errorComponent: () => <ErrorPage />,
});

function RootComponent() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <ThemeToggle />
        </header>
        <div className="flex h-full flex-col gap-6">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster position="bottom-center" />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </SidebarProvider>
  );
}
