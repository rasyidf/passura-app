import { createFileRoute } from "@tanstack/react-router";
import AnimalTypesScreen from "@/components/screen/animal-types/AnimalTypesScreen";

export const Route = createFileRoute("/dashboard/animal-types")({
  component: AnimalTypesScreen,
  ssr: false,
});
