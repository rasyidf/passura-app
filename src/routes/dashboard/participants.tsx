import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const ParticipantsScreen = lazy(
  () => import("@/components/screen/participants/ParticipantsScreen")
);

export const Route = createFileRoute("/dashboard/participants")({
  component: ParticipantsScreen,
  ssr: false,
});
