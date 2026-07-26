import type { Loan, Receipt, Handover } from "../db/types";

// ─── Draft Storage Keys ───────────────────────────────────────────────────────

export const LOAN_DRAFT_KEY = "kiosk-draft-loan" as const;
export const RECEIPT_DRAFT_KEY = "kiosk-draft-receipt" as const;
export const HANDOVER_DRAFT_KEY = "kiosk-draft-handover" as const;

export type KioskDraftKey =
  | typeof LOAN_DRAFT_KEY
  | typeof RECEIPT_DRAFT_KEY
  | typeof HANDOVER_DRAFT_KEY;

// ─── Base Draft Interface ─────────────────────────────────────────────────────

export interface KioskDraftBase {
  flowType: "loan" | "receipt" | "handover";
  currentStep: number; // 0-based step index
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

// ─── Loan Kiosk Draft ─────────────────────────────────────────────────────────

export interface LoanKioskDraft extends KioskDraftBase {
  flowType: "loan";
  groupId: string | null;
  /** Human-readable group name — stored so the pure mapping function can write
   *  it to the Loan's `event` field without a DB lookup. */
  groupName: string | null;
  lenderClanId: string | null;
  /** Human-readable lender clan name — stored for summary display (Requirement 6.4). */
  lenderClanName: string | null;
  borrowerClanId: string | null;
  /** Human-readable borrower clan name — stored for summary display (Requirement 6.4). */
  borrowerClanName: string | null;
  loanType: "money" | "animal" | null;
  moneyAmount: number | null;
  animalTypeId: string | null;
  /** Human-readable animal type name — stored for summary display (Requirement 6.4). */
  animalTypeName: string | null;
  quantity: number | null;
  dateIssued: string | null; // ISO date string (YYYY-MM-DD)
  witnessIds: string[];
}

// ─── Receipt Kiosk Draft ──────────────────────────────────────────────────────

export interface ReceiptKioskDraft extends KioskDraftBase {
  flowType: "receipt";
  groupId: string | null;
  /** Human-readable group name for display and mapping. */
  groupName: string | null;
  receiverClanId: string | null;
  /** Human-readable receiving clan name — stored for summary display (Requirement 7.5). */
  receiverClanName: string | null;
  giverClanId: string | null;
  /** Human-readable giving clan name — stored for summary display (Requirement 7.5). */
  giverClanName: string | null;
  obligationType: Receipt["obligationType"] | null;
  assetType: "money" | "animal" | null;
  moneyAmount: number | null;
  animalTypeId: string | null;
  /** Human-readable animal type name — stored for summary display (Requirement 7.5). */
  animalTypeName: string | null;
  quantity: number | null;
  dateReceived: string | null; // ISO date string
  witnessIds: string[];
}

// ─── Handover Kiosk Draft ─────────────────────────────────────────────────────

export interface HandoverKioskDraft extends KioskDraftBase {
  flowType: "handover";
  groupId: string | null;
  /** Human-readable group name for display and mapping. */
  groupName: string | null;
  fromClanId: string | null;
  /** Human-readable source clan name — stored for summary display (Requirement 8.5). */
  fromClanName: string | null;
  toClanId: string | null;
  /** Human-readable destination clan name — stored for summary display (Requirement 8.5). */
  toClanName: string | null;
  obligationType: Handover["obligationType"] | null;
  assetType: "money" | "animal" | null;
  moneyAmount: number | null;
  animalTypeId: string | null;
  /** Human-readable animal type name — stored for summary display (Requirement 8.5). */
  animalTypeName: string | null;
  quantity: number | null;
  date: string | null; // ISO date string
  witnessIds: string[];
}

// ─── Mapping Functions ────────────────────────────────────────────────────────

/**
 * Maps a completed `LoanKioskDraft` to a new Loan entity payload (without
 * server-assigned fields: id, syncStatus, createdAt, updatedAt).
 *
 * Throws an error with an Indonesian message if the lender and borrower are
 * the same clan (Requirement 6.7).
 *
 * The caller must ensure `groupId`, `groupName`, `lenderClanId`,
 * `borrowerClanId`, `loanType`, and `dateIssued` are non-null before calling.
 */
export function draftToLoan(
  draft: LoanKioskDraft
): Omit<Loan, "id" | "syncStatus" | "createdAt" | "updatedAt"> {
  const {
    groupId,
    groupName,
    lenderClanId,
    borrowerClanId,
    loanType,
    moneyAmount,
    animalTypeId,
    quantity,
    dateIssued,
    witnessIds,
  } = draft;

  if (!lenderClanId || !borrowerClanId) {
    throw new Error("Pemberi pinjaman dan peminjam harus dipilih.");
  }

  if (lenderClanId === borrowerClanId) {
    throw new Error("Pemberi dan peminjam tidak boleh sama.");
  }

  if (!loanType) {
    throw new Error("Jenis pinjaman harus dipilih.");
  }

  if (!dateIssued) {
    throw new Error("Tanggal pinjaman harus diisi.");
  }

  const loan: Omit<Loan, "id" | "syncStatus" | "createdAt" | "updatedAt"> = {
    group: groupId ?? undefined,
    event: groupName ?? "",
    lender: lenderClanId,
    borrower: borrowerClanId,
    loanType: loanType === "money" ? "money" : "animal",
    status: "requested",
    dateIssued,
    witnesses: witnessIds,
    repayments: [],
  };

  if (loanType === "money") {
    loan.moneyAmount = moneyAmount ?? undefined;
  } else {
    loan.animalType = animalTypeId ?? undefined;
    loan.quantity = quantity ?? undefined;
  }

  return loan;
}

/**
 * Maps a completed `ReceiptKioskDraft` to a new Receipt entity payload (without
 * server-assigned fields: id, syncStatus, createdAt, updatedAt).
 *
 * Sets `settlementStatus: "pending"` as required by Requirement 7.2.
 *
 * The caller must ensure all required fields are non-null before calling.
 */
export function draftToReceipt(
  draft: ReceiptKioskDraft
): Omit<Receipt, "id" | "syncStatus" | "createdAt" | "updatedAt"> {
  const {
    groupId,
    receiverClanId,
    giverClanId,
    obligationType,
    assetType,
    moneyAmount,
    animalTypeId,
    quantity,
    dateReceived,
    witnessIds,
  } = draft;

  if (!receiverClanId || !giverClanId) {
    throw new Error("Penerima dan pemberi harus dipilih.");
  }

  if (receiverClanId === giverClanId) {
    throw new Error("Penerima dan pemberi tidak boleh sama.");
  }

  if (!obligationType) {
    throw new Error("Jenis kewajiban harus dipilih.");
  }

  if (!assetType) {
    throw new Error("Jenis aset harus dipilih.");
  }

  if (!dateReceived) {
    throw new Error("Tanggal penerimaan harus diisi.");
  }

  const receipt: Omit<
    Receipt,
    "id" | "syncStatus" | "createdAt" | "updatedAt"
  > = {
    group: groupId ?? undefined,
    receiver: receiverClanId,
    giver: giverClanId,
    obligationType,
    assetType: assetType === "money" ? "money" : "animal",
    dateReceived,
    settlementStatus: "pending",
    witnesses: witnessIds,
  };

  if (assetType === "money") {
    receipt.moneyAmount = moneyAmount ?? undefined;
  } else {
    receipt.animalType = animalTypeId ?? undefined;
    receipt.quantity = quantity ?? undefined;
  }

  return receipt;
}

/**
 * Maps a completed `HandoverKioskDraft` to a new Handover entity payload
 * (without server-assigned fields: id, syncStatus, createdAt, updatedAt).
 *
 * The caller must ensure all required fields are non-null before calling.
 */
export function draftToHandover(
  draft: HandoverKioskDraft
): Omit<Handover, "id" | "syncStatus" | "createdAt" | "updatedAt"> {
  const {
    groupId,
    fromClanId,
    toClanId,
    obligationType,
    assetType,
    moneyAmount,
    animalTypeId,
    quantity,
    date,
    witnessIds,
  } = draft;

  if (!fromClanId || !toClanId) {
    throw new Error("Clan asal dan tujuan harus dipilih.");
  }

  if (fromClanId === toClanId) {
    throw new Error("Clan asal dan tujuan tidak boleh sama.");
  }

  if (!obligationType) {
    throw new Error("Jenis kewajiban harus dipilih.");
  }

  if (!assetType) {
    throw new Error("Jenis aset harus dipilih.");
  }

  if (!date) {
    throw new Error("Tanggal penyerahan harus diisi.");
  }

  const handover: Omit<
    Handover,
    "id" | "syncStatus" | "createdAt" | "updatedAt"
  > = {
    group: groupId ?? undefined,
    fromClan: fromClanId,
    toClan: toClanId,
    obligationType,
    assetType: assetType === "money" ? "money" : "animal",
    date,
    witnesses: witnessIds,
  };

  if (assetType === "money") {
    handover.moneyAmount = moneyAmount ?? undefined;
  } else {
    handover.animalType = animalTypeId ?? undefined;
    handover.quantity = quantity ?? undefined;
  }

  return handover;
}
