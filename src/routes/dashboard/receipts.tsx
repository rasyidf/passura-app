import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const ReceiptsScreen = lazy(
  () => import("@/components/screen/receipts/ReceiptsScreen")
);

export const Route = createFileRoute("/dashboard/receipts")({
  component: ReceiptsScreen,
  ssr: false,
});
