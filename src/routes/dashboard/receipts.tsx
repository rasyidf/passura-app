import { createFileRoute } from "@tanstack/react-router";
import ReceiptsScreen from "@/components/screen/receipts/ReceiptsScreen";

export const Route = createFileRoute("/dashboard/receipts")({
  component: ReceiptsScreen,
  ssr: false,
});
