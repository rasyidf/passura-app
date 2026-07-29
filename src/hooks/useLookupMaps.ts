import { useMemo } from "react";
import { useLocalQuery } from "./useLocalQuery";
import type { Clan, AnimalType } from "@/db/types";

/**
 * Returns a memoized `{ [id]: name }` map for all clans.
 * Replaces the inline `useMemo(() => Object.fromEntries(clans.map(...)), [clans])` pattern.
 */
export function useClanMap(): Record<string, string> {
  const { data } = useLocalQuery<Clan>("clans");
  const clans = data?.docs ?? [];
  return useMemo(
    () => Object.fromEntries(clans.map((c) => [c.id, c.name])),
    [clans],
  );
}

/**
 * Returns a memoized `{ [id]: name }` map for all animal types.
 * Replaces the inline `useMemo(() => Object.fromEntries(animalTypes.map(...)), [animalTypes])` pattern.
 */
export function useAnimalTypeMap(): Record<string, string> {
  const { data } = useLocalQuery<AnimalType>("animal-types");
  const animalTypes = data?.docs ?? [];
  return useMemo(
    () => Object.fromEntries(animalTypes.map((a) => [a.id, a.name])),
    [animalTypes],
  );
}
