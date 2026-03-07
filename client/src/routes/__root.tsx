import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { RouterContext } from "@/lib/router";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorPage } from "@/components/error-page";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <RootComponent />,
  errorComponent: ({ error, reset }) => (
    <ErrorPage error={error} reset={reset} />
  ),
});

function RootComponent() {
  const { auth } = Route.useRouteContext();

  if (!auth.isAuthenticated && !auth.isLoading) {
    return (
      <TooltipProvider>
        <Outlet />
        <Toaster position="bottom-center" />
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-right" />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col">
        <AppHeader />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-center" />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </TooltipProvider>
  );
}
