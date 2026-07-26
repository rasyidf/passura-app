import Dexie, { type Table } from "dexie";
import type {
  Clan,
  Elder,
  Participant,
  Group,
  AnimalType,
  Loan,
  Receipt,
  Handover,
  Obligation,
  SyncLogEntry,
  AppConfig,
} from "./types";

export class PassuraDb extends Dexie {
  clans!: Table<Clan, string>;
  elders!: Table<Elder, string>;
  participants!: Table<Participant, string>;
  groups!: Table<Group, string>;
  animalTypes!: Table<AnimalType, string>;
  loans!: Table<Loan, string>;
  receipts!: Table<Receipt, string>;
  handovers!: Table<Handover, string>;
  obligations!: Table<Obligation, string>;
  syncLog!: Table<SyncLogEntry, number>;
  appConfig!: Table<AppConfig, string>;

  constructor() {
    super("passura-local");

    this.version(1).stores({
      clans: "id, name, region, syncStatus",
      elders: "id, name, clan, email, syncStatus",
      participants: "id, name, clan, syncStatus",
      groups: "id, name, syncStatus",
      animalTypes: "id, name, category, syncStatus",
      loans: "id, lender, borrower, status, group, syncStatus",
      receipts: "id, receiver, giver, group, syncStatus",
      handovers: "id, fromClan, toClan, group, syncStatus",
      obligations: "id, giver, receiver, syncStatus",
      syncLog: "++id, entityType, entityId, action, [syncStatus+createdAt]",
      appConfig: "key",
    });
  }
}

export const db = new PassuraDb();
