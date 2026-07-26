import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  clansRepo,
  eldersRepo,
  participantsRepo,
  groupsRepo,
  animalTypesRepo,
  loansRepo,
  receiptsRepo,
  handoversRepo,
  obligationsRepo,
} from "@/db/repositories";
import type { BaseEntity } from "@/db/types";
import type { BaseRepository } from "@/db/repositories/base.repo";

const repoMap: Record<string, BaseRepository<any>> = {
  clans: clansRepo,
  elders: eldersRepo,
  participants: participantsRepo,
  groups: groupsRepo,
  animalTypes: animalTypesRepo,
  "animal-types": animalTypesRepo,
  loans: loansRepo,
  receipts: receiptsRepo,
  handovers: handoversRepo,
  obligations: obligationsRepo,
};

type CollectionName = keyof typeof repoMap;

/**
 * Drop-in replacement for useCollection from Payload.
 * Reads from Dexie (IndexedDB) instead of server API.
 */
export function useLocalQuery<T extends BaseEntity = BaseEntity>(
  collection: CollectionName,
  filter?: Partial<T>
): UseQueryResult<{ docs: T[]; totalDocs: number }> {
  const repo = repoMap[collection];
  if (!repo) throw new Error(`Unknown collection: ${collection}`);

  return useQuery({
    queryKey: ["collection", collection, filter],
    queryFn: async () => {
      const docs = filter
        ? await repo.query(filter)
        : await repo.getAll();
      return { docs: docs as T[], totalDocs: docs.length };
    },
    staleTime: 1000 * 30, // 30 s — avoids re-fetching on every navigation
  });
}

/**
 * Get a single document by ID from Dexie.
 */
export function useLocalDoc<T extends BaseEntity = BaseEntity>(
  collection: CollectionName,
  id: string | null | undefined
): UseQueryResult<T | undefined> {
  const repo = repoMap[collection];
  if (!repo) throw new Error(`Unknown collection: ${collection}`);

  return useQuery({
    queryKey: ["doc", collection, id],
    queryFn: async () => {
      if (!id) return undefined;
      return repo.getById(id) as Promise<T | undefined>;
    },
    enabled: !!id,
  });
}
