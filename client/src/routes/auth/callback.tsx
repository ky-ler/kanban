import { LoadingSpinner } from "@/components/loading-spinner";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackRoute,
});

function AuthCallbackRoute() {
  return <LoadingSpinner className="min-h-screen" />;
}
