import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

const AnimalTypesScreen = lazy(
  () => import("@/components/screen/animal-types/AnimalTypesScreen")
);

export const Route = createFileRoute("/dashboard/animal-types")({
  component: AnimalTypesScreen,
  ssr: false,
});
