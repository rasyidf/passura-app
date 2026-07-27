import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/backup")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings" });
  },
});
