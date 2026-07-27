import type {
  AnimalType,
  Clan,
  Elder,
  Group,
  Handover,
  Loan,
  Obligation,
  Participant,
  Receipt,
} from "@/db/types";

export interface BackupFile {
  version: 1;
  tenantId: string;
  exportedAt: string; // ISO-8601 datetime
  entities: {
    clans: Clan[];
    elders: Elder[];
    participants: Participant[];
    groups: Group[];
    animalTypes: AnimalType[];
    loans: Loan[];
    receipts: Receipt[];
    handovers: Handover[];
    obligations: Obligation[];
  };
}

export interface ExportResult {
  backup: BackupFile;
  counts: Record<string, number>; // tableName → record count
}

export type ImportResult =
  | { success: true; counts: Record<string, number> }
  | { success: false; error: string; failedTable?: string };
