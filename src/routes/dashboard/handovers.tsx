import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const HandoversScreen = lazy(
  () => import("@/components/screen/handovers/HandoversScreen")
);

export const Route = createFileRoute("/dashboard/handovers")({
  component: HandoversScreen,
  ssr: false,
});
