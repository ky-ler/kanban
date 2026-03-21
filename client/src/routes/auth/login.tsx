import { LoadingSpinner } from "@/components/loading-spinner";
import { env } from "@/config/env";
import { normalizeRedirectTarget } from "@/features/auth/auth-navigation";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "@/lib/router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    force: typeof search.force === "boolean" ? search.force : undefined,
  }),
  component: AuthLoginRoute,
});

function AuthLoginRoute() {
  const auth = useAuth0Context();
  const { redirect, force } = Route.useSearch();
  const redirectTarget = normalizeRedirectTarget(redirect);
  const shouldForceLogin = force ?? false;
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (auth.isLoading || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    if (auth.isAuthenticated && !shouldForceLogin) {
      void router.navigate({ href: redirectTarget, replace: true });
      return;
    }

    void auth.loginWithRedirect({
      appState: { returnTo: redirectTarget },
      authorizationParams: {
        redirect_uri: env.VITE_AUTH0_CALLBACK_URL,
        max_age: shouldForceLogin ? 0 : undefined,
      },
    });
  }, [auth, redirectTarget, shouldForceLogin]);

  return <LoadingSpinner className="min-h-screen" />;
}
