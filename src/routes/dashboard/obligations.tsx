import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const ObligationsScreen = lazy(
  () => import("@/components/screen/obligations/ObligationsScreen")
);

export const Route = createFileRoute("/dashboard/obligations")({
  component: ObligationsScreen,
  ssr: false,
});
