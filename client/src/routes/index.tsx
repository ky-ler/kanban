import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoading && context.auth.isAuthenticated) {
      // If a user IS logged in, redirect them to the authenticated "/boards" route
      throw redirect({ to: "/boards" });
    }
  },
  component: Index,
});

// TODO: create a cool landing page 👍
function Index() {
  const auth = useAuth0Context();

  return <button onClick={() => auth.loginWithRedirect()}>Sign In</button>;
}
