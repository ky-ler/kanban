import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoading && !context.auth.isAuthenticated) {
      context.auth.loginWithRedirect();
      return;
    }
  },
  component: () => <Outlet />,
});
