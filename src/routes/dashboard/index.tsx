import { createFileRoute } from "@tanstack/react-router";
import { DashboardScreen } from "@/components/screen/DashboardScreen";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardScreen,
});
