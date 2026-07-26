import { createFileRoute } from "@tanstack/react-router";
import GroupsScreen from "@/components/screen/groups/GroupsScreen";

export const Route = createFileRoute("/dashboard/groups")({
  component: GroupsScreen,
  ssr: false,
});
