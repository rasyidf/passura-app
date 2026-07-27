import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/sync")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings" });
  },
});
