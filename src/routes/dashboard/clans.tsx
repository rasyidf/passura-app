import { createFileRoute } from "@tanstack/react-router";
import ClansScreen from "@/components/screen/clans/ClansScreen";

export const Route = createFileRoute("/dashboard/clans")({
  component: ClansScreen,
  ssr: false,
});
