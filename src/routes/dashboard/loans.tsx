import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const LoansScreen = lazy(
  () => import("@/components/screen/loans/LoansScreen")
);

export const Route = createFileRoute("/dashboard/loans")({
  component: LoansScreen,
  ssr: false,
});
