import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const ClansScreen = lazy(
  () => import("@/components/screen/clans/ClansScreen")
);

export const Route = createFileRoute("/dashboard/clans")({
  component: ClansScreen,
  ssr: false,
});
