import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/boards/archived")({
  beforeLoad: () => {
    throw redirect({
      to: "/boards",
      search: {
        archive: "boards",
      },
    });
  },
});
