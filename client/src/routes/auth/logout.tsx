import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/logout")({
  component: AuthLogoutRoute,
});

function AuthLogoutRoute() {
  const auth = useAuth0Context();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    auth.logout();
  }, [auth]);

  return <LoadingSpinner className="min-h-screen" />;
}
