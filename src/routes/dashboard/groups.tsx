import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const GroupsScreen = lazy(
  () => import("@/components/screen/groups/GroupsScreen")
);

export const Route = createFileRoute("/dashboard/groups")({
  component: GroupsScreen,
  ssr: false,
});
