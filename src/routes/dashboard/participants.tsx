import { createFileRoute } from "@tanstack/react-router";
import ParticipantsScreen from "@/components/screen/participants/ParticipantsScreen";

export const Route = createFileRoute("/dashboard/participants")({
  component: ParticipantsScreen,
  ssr: false,
});
