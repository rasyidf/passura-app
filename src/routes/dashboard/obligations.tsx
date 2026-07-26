import { createFileRoute } from "@tanstack/react-router";
import ObligationsScreen from "@/components/screen/obligations/ObligationsScreen";

export const Route = createFileRoute("/dashboard/obligations")({
  component: ObligationsScreen,
  ssr: false,
});
