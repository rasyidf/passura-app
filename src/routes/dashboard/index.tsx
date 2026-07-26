import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const DashboardScreen = lazy(
  () => import("@/components/screen/DashboardScreen").then((m) => ({ default: m.DashboardScreen }))
);

export const Route = createFileRoute("/dashboard/")({
  component: DashboardScreen,
});
