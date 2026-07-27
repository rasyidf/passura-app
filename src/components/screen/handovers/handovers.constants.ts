import { OBLIGATION_TYPES, OBLIGATION_BADGE, ASSET_BADGE } from "@/components/shared/screen-helpers";

// Re-export shared constants so HandoversScreen and HandoverFormDialog can import
// from a single local module rather than reaching into the shared helpers directly.
export { OBLIGATION_TYPES, OBLIGATION_BADGE, ASSET_BADGE };

/** Form field shape for the handover create / edit dialog. */
export interface HandoverFormValues {
  fromClan: string;
  toClan: string;
  assetType: string;
  obligationType: string;
  moneyAmount: string;
  animalType: string;
  quantity: string;
  date: string;
  notes: string;
}

/** Builds the IndexedDB payload from the validated form values. */
export function buildHandoverPayload(v: HandoverFormValues): Record<string, unknown> {
  const p: Record<string, unknown> = {
    fromClan: v.fromClan,
    toClan: v.toClan,
    assetType: v.assetType,
    obligationType: v.obligationType,
    date: v.date,
    notes: v.notes || undefined,
  };
  if (v.assetType === "money") p.moneyAmount = Number(v.moneyAmount) || 0;
  if (v.assetType === "animal") {
    p.animalType = v.animalType;
    p.quantity = Number(v.quantity) || 1;
  }
  return p;
}
