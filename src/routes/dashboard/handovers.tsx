import { createFileRoute } from "@tanstack/react-router";
import HandoversScreen from "@/components/screen/handovers/HandoversScreen";

export const Route = createFileRoute("/dashboard/handovers")({
  component: HandoversScreen,
  ssr: false,
});
