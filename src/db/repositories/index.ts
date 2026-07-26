import { db } from "../local-db";
import { BaseRepository } from "./base.repo";
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
} from "../types";

export const clansRepo = new BaseRepository<Clan>("clans", db.clans);
export const eldersRepo = new BaseRepository<Elder>("elders", db.elders);
export const participantsRepo = new BaseRepository<Participant>("participants", db.participants);
export const groupsRepo = new BaseRepository<Group>("groups", db.groups);
export const animalTypesRepo = new BaseRepository<AnimalType>("animalTypes", db.animalTypes);
export const loansRepo = new BaseRepository<Loan>("loans", db.loans);
export const receiptsRepo = new BaseRepository<Receipt>("receipts", db.receipts);
export const handoversRepo = new BaseRepository<Handover>("handovers", db.handovers);
export const obligationsRepo = new BaseRepository<Obligation>("obligations", db.obligations);

// Re-export base for custom extensions
export { BaseRepository } from "./base.repo";
