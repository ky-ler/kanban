import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/boards/create")({
  component: CreateBoardComponent,
});

// TODO: (?) Turn modal into a full page
// Creating a board might be better as a popup
// modal within the home page or sidebar board switcher
function CreateBoardComponent() {
  return <></>;
}
