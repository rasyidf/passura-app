import { OBLIGATION_TYPES, OBLIGATION_BADGE, ASSET_BADGE } from "@/components/shared/screen-helpers";

export { OBLIGATION_TYPES, OBLIGATION_BADGE, ASSET_BADGE };

/** Settlement status badge config. */
export const SETTLEMENT_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Tertunda", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  partial: { label: "Sebagian", className: "bg-blue-100 text-blue-700 border-blue-200" },
  settled: { label: "Lunas",    className: "bg-green-100 text-green-700 border-green-200" },
};

/** Filter options for settlement status. */
export const SETTLEMENT_STATUS_FILTER_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Sebagian" },
  { value: "settled", label: "Lunas" },
];

/** Form field shape for the receipt create / edit dialog. */
export interface ReceiptFormValues {
  receiver: string;
  giver: string;
  assetType: string;
  obligationType: string;
  moneyAmount: string;
  animalType: string;
  quantity: string;
  dateReceived: string;
  notes: string;
}

/** Builds the IndexedDB payload from the validated form values. */
export function buildReceiptPayload(v: ReceiptFormValues): Record<string, unknown> {
  const p: Record<string, unknown> = {
    receiver: v.receiver,
    giver: v.giver,
    assetType: v.assetType,
    obligationType: v.obligationType,
    dateReceived: v.dateReceived,
    notes: v.notes || undefined,
  };
  if (v.assetType === "money") p.moneyAmount = Number(v.moneyAmount) || 0;
  if (v.assetType === "animal") {
    p.animalType = v.animalType;
    p.quantity = Number(v.quantity) || 1;
  }
  return p;
}
