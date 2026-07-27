import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const SettingsScreen = lazy(
  () => import("@/components/screen/settings/SettingsScreen")
);

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsScreen,
  ssr: false,
});
