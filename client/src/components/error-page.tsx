import type { ReactNode } from "react";
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
  isAuthenticated?: boolean;
}

interface ErrorPageConfig {
  title: string;
  message: ReactNode;
}

export function ErrorPage({
  error,
  reset,
  isAuthenticated = false,
}: ErrorPageProps) {
  const apiError = error instanceof ApiError ? error : null;
  const status = apiError?.status;
  const isUnauthorized = status === 401;
  const isForbidden = status === 403;

  const config: ErrorPageConfig = isUnauthorized
    ? {
        title: "Sign in required",
        message:
          "Your session is no longer valid. Sign in again to continue where you left off.",
      }
    : isForbidden
      ? {
          title: "Access removed",
          message: "You no longer have permission to view this resource.",
        }
      : {
          title: "Oops! Something went wrong.",
          message: isAuthenticated ? (
            "An unexpected error has occurred. Please try again."
          ) : (
            <>
              An unexpected error has occurred. Please try refreshing the page
              or go{" "}
              <Link to="/" className="text-primary underline">
                back to Home
              </Link>
              .
            </>
          ),
        };

  const showActions = isUnauthorized || isForbidden || Boolean(reset);

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">{config.title}</h1>
      <p className="text-muted-foreground max-w-md">{config.message}</p>

      {showActions ? (
        <div className="flex gap-3">
          {isUnauthorized ? (
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
          ) : null}

          {isForbidden ? (
            <Button type="button" asChild>
              <Link to="/boards" search={{ archive: undefined }}>
                Back to boards
              </Link>
            </Button>
          ) : null}

          {!isUnauthorized && !isForbidden && reset ? (
            <Button type="button" variant="outline" onClick={reset}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
