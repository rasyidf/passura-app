// ─── Sync Status ─────────────────────────────────────────────────────────────
export type SyncStatus = "local" | "pending" | "synced" | "conflict";

// ─── Base entity ─────────────────────────────────────────────────────────────
export interface BaseEntity {
  id: string;
  syncStatus: SyncStatus;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

// ─── Clans ───────────────────────────────────────────────────────────────────
export interface Clan extends BaseEntity {
  name: string;
  region?: string;
  lineageHead?: string; // participant ID
}

// ─── Elders ──────────────────────────────────────────────────────────────────
export interface Elder extends BaseEntity {
  name: string;
  email: string;
  passwordHash: string; // PBKDF2 hash
  salt: string;
  clan?: string; // clan ID
  role: "superadmin" | "validator" | "participant";
}

// ─── Participants ────────────────────────────────────────────────────────────
export interface Participant extends BaseEntity {
  name: string;
  clan: string; // clan ID
  role: "head" | "member" | "ancestor";
  gender?: "male" | "female" | "other";
  passedAway?: boolean;
  next?: string; // next participant ID (linked list)
  notes?: string;
  relations?: ParticipantRelation[];
}

export type RelationshipType =
  | "father" | "mother" | "spouse" | "child"
  | "sibling" | "grandparent" | "uncle_aunt" | "cousin" | "other";

export interface ParticipantRelation {
  type: RelationshipType;
  participantId: string;
  notes?: string;
}

// ─── Groups ──────────────────────────────────────────────────────────────────
export interface Group extends BaseEntity {
  name: string;
  eventName?: string;
  description?: string;
  members: string[]; // clan IDs
}

// ─── Animal Types ────────────────────────────────────────────────────────────
export interface AnimalType extends BaseEntity {
  name: string;
  category: "buffalo" | "pig";
  breed: string;
  geneticLine?: string;
  quality: "low" | "medium" | "high" | "unique";
  price: number;
}

// ─── Loans ───────────────────────────────────────────────────────────────────
export interface Repayment {
  id: string;
  repaymentType: "animal" | "money";
  animalType?: string;
  moneyAmount?: number;
  quantity?: number;
  date: string;
  witnesses: string[];
  calculatedValue?: number;
  note?: string;
}

export interface Loan extends BaseEntity {
  group?: string;
  lender: string; // clan ID
  borrower: string; // clan ID
  loanType: "animal" | "money";
  animalType?: string;
  moneyAmount?: number;
  quantity?: number;
  event: string;
  dateIssued: string;
  status:
    | "requested"
    | "approved"
    | "active"
    | "settled"
    | "defaulted"
    | "canceled";
  witnesses: string[];
  repayments: Repayment[];
  calculatedPrincipalValue?: number;
  remainingValue?: number;
  notes?: string;
  summary?: string;
}

// ─── Receipts ────────────────────────────────────────────────────────────────
export interface Receipt extends BaseEntity {
  group?: string;
  receiver: string; // clan ID
  giver: string; // clan ID
  obligationType: "ritual" | "social" | "wedding" | "funeral" | "other";
  assetType: "animal" | "money";
  animalType?: string;
  quantity?: number;
  moneyAmount?: number;
  dateReceived: string;
  settlementStatus: "pending" | "partial" | "settled";
  witnesses: string[];
  notes?: string;
  calculatedValue?: number;
  summary?: string;
}

// ─── Handovers ───────────────────────────────────────────────────────────────
export interface Handover extends BaseEntity {
  group?: string;
  fromClan: string; // clan ID
  toClan: string; // clan ID
  obligationType: "ritual" | "social" | "wedding" | "funeral" | "other";
  assetType: "animal" | "money";
  animalType?: string;
  quantity?: number;
  moneyAmount?: number;
  date: string;
  witnesses: string[];
  notes?: string;
  calculatedValue?: number;
  summary?: string;
}

// ─── Obligations ─────────────────────────────────────────────────────────────
export interface Obligation extends BaseEntity {
  giver: string; // clan ID
  receiver: string; // clan ID
  paymentType: "animal" | "money";
  animalType?: string;
  moneyAmount?: number;
  quantity: number;
  event: string;
  date: string;
  witnesses: string[];
  calculatedValue?: number;
  summary?: string;
}

// ─── Sync Log ────────────────────────────────────────────────────────────────
export interface SyncLogEntry {
  id?: number; // auto-increment
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  syncStatus: "pending" | "synced" | "failed" | "conflict";
  syncError?: string; // stores per-entry rejection reason for conflict entries
  createdAt: number;
}

// ─── App Config ──────────────────────────────────────────────────────────────
/**
 * Key–value store for application configuration persisted in Dexie.
 *
 * Well-known keys:
 * - `session-elder-id`  — local auth session (string)
 * - `sync-token`        — JWT from `/api/auth/login` (string)
 * - `sync-cursor`       — Unix timestamp (seconds) of last successful pull (string)
 * - `tenant-id`         — UUID v4 identifying the local tenant (string)
 * - `api-url`           — configured API base URL, overrides `VITE_API_URL` (string)
 * - `auto-sync-enabled` — whether the 5-min auto-sync scheduler is active (boolean)
 */
export interface AppConfig {
  key: string;
  value: unknown;
}
