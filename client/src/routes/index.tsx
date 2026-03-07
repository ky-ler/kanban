import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import {
  ArrowRight,
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
      <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <KanbanSquare className="size-5 text-primary" />
            Kanban
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signIn}>
              Sign In
            </Button>
            <Button size="sm" onClick={signUp}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <p className="text-primary mb-3 text-xs font-medium uppercase tracking-widest">
          Project Management
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Organize your work, your way
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm">
          A real-time kanban board to help you and your team stay on top of tasks
          — from backlog to done.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" onClick={signUp}>
            Get Started Free
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-20 md:pb-28">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: LayoutDashboard,
              title: "Boards & Columns",
              description:
                "Create and customize kanban boards with columns that match your workflow.",
            },
            {
              icon: Users,
              title: "Real-time Collaboration",
              description:
                "Invite team members and see updates the moment they happen.",
            },
            {
              icon: GripVertical,
              title: "Drag & Drop",
              description:
                "Reorder tasks and columns effortlessly with intuitive drag and drop.",
            },
          ].map((feature) => (
            <Card key={feature.title}>
              <CardContent className="space-y-2">
                <feature.icon className="text-primary size-5" />
                <h3 className="text-sm font-medium">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
          <h2 className="text-lg font-semibold">Ready to get organized?</h2>
          <p className="text-muted-foreground mt-2 text-xs">
            Start managing your projects in seconds.
          </p>
          <Button className="mt-6" onClick={signUp}>
            Sign Up Free
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
