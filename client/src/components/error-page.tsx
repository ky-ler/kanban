import { Link } from "@tanstack/react-router";

export function ErrorPage() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Oops! Something went wrong.</h1>
      <p className="text-muted-foreground text-center">
        An unexpected error has occurred. Please try refreshing the page or go{" "}
        <Link to="/" className="text-primary underline">
          back to Home
        </Link>
        .
      </p>
    </div>
  );
}
