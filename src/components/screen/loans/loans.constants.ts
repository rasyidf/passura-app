/** Status badge config for loan status values. */
export const LOAN_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  requested: { label: "Diminta",   variant: "outline" },
  approved:  { label: "Disetujui", variant: "secondary" },
  active:    { label: "Aktif",     variant: "default" },
  settled:   { label: "Lunas",     variant: "secondary" },
  defaulted: { label: "Gagal",     variant: "destructive" },
  canceled:  { label: "Batal",     variant: "outline" },
};

/** Filter options for loan status. */
export const LOAN_STATUS_FILTER_OPTIONS = [
  { value: "active",    label: "Aktif" },
  { value: "settled",   label: "Lunas" },
  { value: "requested", label: "Diminta" },
];

/** Filter options for loan type. */
export const LOAN_TYPE_FILTER_OPTIONS = [
  { value: "animal", label: "Hewan" },
  { value: "money",  label: "Uang" },
];

/** Represents a loan row augmented with resolved clan display names. */
export type LoanRow = import("@/db/types").Loan & {
  borrowerName: string;
  lenderName: string;
};
