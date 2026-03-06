import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import {
  GripVertical,
  KanbanSquare,
  LayoutDashboard,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoading && context.auth.isAuthenticated) {
      throw redirect({ to: "/boards" });
    }
  },
  component: Index,
});

function Index() {
  const auth = useAuth0Context();

  const signUp = () =>
    auth.loginWithRedirect({
      authorizationParams: { screen_hint: "signup" },
    });

  const signIn = () => auth.loginWithRedirect();

  return (
    <div className="bg-background text-foreground min-h-svh">
      {/* Nav */}
      <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <KanbanSquare className="size-5" />
            Kanban
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signIn}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Organize your work, your way
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
          A simple, real-time kanban board to help you and your team stay on top
          of tasks — from backlog to done.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button size="lg" onClick={signUp}>
            Get Started
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Learn More
          </Button>
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl" />

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          Everything you need to stay productive
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <LayoutDashboard className="text-primary size-8" />
              <CardTitle className="mt-2">Boards &amp; Columns</CardTitle>
              <CardDescription>
                Create and customize kanban boards with columns that match your
                workflow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="text-primary size-8" />
              <CardTitle className="mt-2">Real-time Collaboration</CardTitle>
              <CardDescription>
                Invite team members and see updates the moment they happen.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <GripVertical className="text-primary size-8" />
              <CardTitle className="mt-2">Drag &amp; Drop</CardTitle>
              <CardDescription>
                Reorder tasks and columns effortlessly with intuitive drag and
                drop.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl" />

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center md:py-24">
        <h2 className="text-2xl font-semibold">Ready to get organized?</h2>
        <p className="text-muted-foreground mt-2">
          Start managing your projects in seconds — no credit card required.
        </p>
        <Button size="lg" className="mt-6" onClick={signUp}>
          Sign Up Free
        </Button>
      </section>
    </div>
  );
}
