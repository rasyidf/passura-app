import { createFileRoute } from "@tanstack/react-router";
import LoansScreen from "@/components/screen/loans/LoansScreen";

export const Route = createFileRoute("/dashboard/loans")({
  component: LoansScreen,
  ssr: false,
});
