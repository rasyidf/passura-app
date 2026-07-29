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
import type { BaseEntity, Clan, Elder, Participant, Group, AnimalType, Loan, Receipt, Handover, Obligation } from "@/db/types";
import type { BaseRepository } from "@/db/repositories/base.repo";

type KnownEntity = Clan | Elder | Participant | Group | AnimalType | Loan | Receipt | Handover | Obligation;

const repoMap: Record<string, BaseRepository<KnownEntity>> = {
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
function useLocalMutation<T extends BaseEntity = BaseEntity>(
  collection: CollectionName,
  action: MutationAction
): UseMutationResult<KnownEntity | undefined, Error, unknown> {
  const qc = useQueryClient();
  const repo = repoMap[collection];
  if (!repo) throw new Error(`Unknown collection: ${collection}`);

  return useMutation({
    mutationFn: async (payload: unknown) => {
      switch (action) {
        case "create":
          return repo.create(payload as Omit<KnownEntity, "id" | "syncStatus" | "createdAt" | "updatedAt">);
        case "update":
          return repo.update((payload as { id: string; data: Partial<KnownEntity> }).id, (payload as { id: string; data: Partial<KnownEntity> }).data);
        case "delete":
          return repo.remove(payload as string);
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
