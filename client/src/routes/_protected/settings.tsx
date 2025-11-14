import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/settings")({
  component: SettingsComponent,
});

function SettingsComponent() {
  return <div>Hello "/_protected/settings"!</div>;
}
