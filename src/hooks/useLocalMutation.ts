import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
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
type MutationAction = "create" | "update" | "delete";

/**
 * Drop-in replacement for useCreateDoc / useUpdateDoc / useDeleteDoc.
 * Writes to Dexie (IndexedDB) and marks syncStatus = "pending".
 */
export function useLocalMutation<T extends BaseEntity = BaseEntity>(
  collection: CollectionName,
  action: MutationAction
): UseMutationResult<any, Error, any> {
  const qc = useQueryClient();
  const repo = repoMap[collection];
  if (!repo) throw new Error(`Unknown collection: ${collection}`);

  return useMutation({
    mutationFn: async (payload: any) => {
      switch (action) {
        case "create":
          return repo.create(payload);
        case "update":
          return repo.update(payload.id, payload.data);
        case "delete":
          return repo.remove(payload);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection", collection] });
    },
  });
}

/**
 * Convenience hook for creating a document.
 */
export function useCreateDoc<T extends BaseEntity = BaseEntity>(
  collection: CollectionName
) {
  return useLocalMutation<T>(collection, "create");
}

/**
 * Convenience hook for updating a document.
 */
export function useUpdateDoc<T extends BaseEntity = BaseEntity>(
  collection: CollectionName
) {
  return useLocalMutation<T>(collection, "update");
}

/**
 * Convenience hook for deleting a document.
 */
export function useDeleteDoc(collection: CollectionName) {
  return useLocalMutation(collection, "delete");
}
