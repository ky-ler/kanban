import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/auth/api-error";
import {
  getAuthLoginSearch,
  getCurrentAppPath,
} from "@/features/auth/auth-navigation";
import { router } from "@/lib/router";
import { Link } from "@tanstack/react-router";

interface ErrorPageProps {
  error?: Error | null;
  reset?: () => void;
}

export function ErrorPage({ error, reset }: ErrorPageProps) {
  const apiError = error instanceof ApiError ? error : null;

  if (apiError?.status === 401) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <p className="text-muted-foreground max-w-md">
          Your session is no longer valid. Sign in again to continue where you
          left off.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() =>
              void router.navigate({
                to: "/auth/login",
                search: getAuthLoginSearch(getCurrentAppPath(), true),
              })
            }
          >
            Sign in again
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (apiError?.status === 403) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold">Access removed</h1>
        <p className="text-muted-foreground max-w-md">
          You no longer have permission to view this resource.
        </p>
        <Button type="button" asChild>
          <Link to="/boards">Back to boards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Oops! Something went wrong.</h1>
      <p className="text-muted-foreground">
        An unexpected error has occurred. Please try refreshing the page or go{" "}
        <Link to="/" className="text-primary underline">
          back to Home
        </Link>
        .
      </p>
      {reset ? (
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
