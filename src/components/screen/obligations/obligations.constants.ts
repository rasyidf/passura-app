import { ASSET_BADGE } from "@/components/shared/screen-helpers";

export { ASSET_BADGE };

/** Form field shape for the obligation create / edit dialog. */
export interface ObligationFormValues {
  giver: string;
  receiver: string;
  paymentType: string;
  animalType: string;
  moneyAmount: string;
  quantity: string;
  event: string;
  date: string;
}

/** Builds the IndexedDB payload from the validated form values. */
export function buildObligationPayload(v: ObligationFormValues): Record<string, unknown> {
  const p: Record<string, unknown> = {
    giver: v.giver,
    receiver: v.receiver,
    paymentType: v.paymentType,
    quantity: Number(v.quantity) || 1,
    event: v.event,
    date: v.date,
  };
  if (v.paymentType === "money") p.moneyAmount = Number(v.moneyAmount) || 0;
  if (v.paymentType === "animal") p.animalType = v.animalType;
  return p;
}
