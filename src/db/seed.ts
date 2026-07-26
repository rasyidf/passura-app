import { db } from "./local-db";
import { generateId, hashPassword } from "@/auth/local-auth";
import type {
  Clan,
  Elder,
  Participant,
  AnimalType,
  Group,
  Loan,
  Receipt,
  Handover,
  ParticipantRelation,
} from "./types";

/**
 * Module-level singleton promise.
 * The first call runs the seed; every subsequent call (including concurrent
 * ones from React Strict Mode double-effects) reuses the same promise and
 * waits for the single run to finish.
 */
let seedPromise: Promise<boolean> | null = null;

/**
 * Seeds demo data into IndexedDB on first run (when no elders exist).
 * Uses bulkPut (upsert) so re-running is always safe and idempotent.
 * Safe to call multiple times concurrently — only one seed ever executes.
 */
export function seedIfEmpty(): Promise<boolean> {
  if (!seedPromise) {
    seedPromise = _runSeed().catch((err) => {
      // Reset so the next call can retry on error
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function _runSeed(): Promise<boolean> {
  const elderCount = await db.elders.count();
  if (elderCount > 0) return false; // Already seeded

  const now = Date.now();

  // ─── Animal Types ─────────────────────────────────────────────────────
  const animalTypesData: Omit<AnimalType, "syncStatus" | "createdAt" | "updatedAt">[] = [
    { id: generateId(), name: "Tedong Bonga", category: "buffalo", breed: "Bonga", geneticLine: "noble", quality: "unique", price: 250_000_000 },
    { id: generateId(), name: "Tedong Saleko", category: "buffalo", breed: "Saleko", geneticLine: "local", quality: "high", price: 120_000_000 },
    { id: generateId(), name: "Tedong Pakpak", category: "buffalo", breed: "Pakpak", geneticLine: "local", quality: "medium", price: 80_000_000 },
    { id: generateId(), name: "Tedong Pudu'", category: "buffalo", breed: "Pudu", geneticLine: "common", quality: "low", price: 35_000_000 },
    { id: generateId(), name: "Babi Tana", category: "pig", breed: "Local Pig", geneticLine: "common", quality: "medium", price: 2_500_000 },
    { id: generateId(), name: "Babi Besar", category: "pig", breed: "Large Pig", geneticLine: "fattened", quality: "high", price: 5_000_000 },
  ];
  const animals: AnimalType[] = animalTypesData.map((a) => ({
    ...a,
    syncStatus: "local" as const,
    createdAt: now,
    updatedAt: now,
  }));
  await db.animalTypes.bulkPut(animals);

  // ─── Clans ────────────────────────────────────────────────────────────
  const clanNames = [
    { name: "Tongkonan Rante", region: "Rantepao" },
    { name: "Tongkonan Sanggalangit", region: "Makale" },
    { name: "Tongkonan Buntu Pune", region: "Sa'dan" },
    { name: "Tongkonan Ke'pe' Tinoring", region: "Sangalla" },
    { name: "Tongkonan Olang", region: "Sesean" },
  ];
  const clans: Clan[] = clanNames.map((c) => ({
    id: generateId(),
    ...c,
    syncStatus: "local" as const,
    createdAt: now,
    updatedAt: now,
  }));
  await db.clans.bulkPut(clans);

  // ─── Elders ───────────────────────────────────────────────────────────
  const { hash: elderHash, salt: elderSalt } = await hashPassword("elder123");
  const { hash: adminHash, salt: adminSalt } = await hashPassword("passura123");

  // Admin elder (full access)
  const adminElder: Elder = {
    id: generateId(),
    name: "Admin Passura",
    email: "admin@passura.local",
    passwordHash: adminHash,
    salt: adminSalt,
    clan: clans[0].id,
    role: "superadmin",
    syncStatus: "local",
    createdAt: now,
    updatedAt: now,
  };
  await db.elders.put(adminElder);

  const eldersData = [
    { name: "Ne' Tato Dena", clan: clans[0].id, role: "validator" as const },
    { name: "Ne' Bua' Sarong", clan: clans[1].id, role: "validator" as const },
    { name: "Ambe' Rante", clan: clans[2].id, role: "participant" as const },
  ];
  const elders: Elder[] = [];
  for (const e of eldersData) {
    const clanSlug = clans
      .find((c) => c.id === e.clan)
      ?.name.toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^tongkonan-/, "")
      .replace(/^-|-$/g, "") ?? "umum";
    const nameSlug = e.name
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const elder: Elder = {
      id: generateId(),
      name: e.name,
      email: `${clanSlug}-${nameSlug}@passura.local`,
      passwordHash: elderHash,
      salt: elderSalt,
      clan: e.clan,
      role: e.role,
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    };
    elders.push(elder);
  }
  await db.elders.bulkPut(elders);

  // ─── Groups ───────────────────────────────────────────────────────────
  const group1: Group = {
    id: generateId(),
    name: "Rambu Solo' Nenek Lai",
    eventName: "Rambu Solo'",
    description: "Upacara pemakaman Nenek Lai, Tongkonan Rante, 2024.",
    members: [clans[0].id, clans[1].id, clans[2].id],
    syncStatus: "local",
    createdAt: now,
    updatedAt: now,
  };
  const group2: Group = {
    id: generateId(),
    name: "Rambu Tuka' Pernikahan Anto",
    eventName: "Rambu Tuka'",
    description: "Pesta pernikahan Anto & Maria, Tongkonan Sanggalangit.",
    members: [clans[1].id, clans[3].id, clans[4].id],
    syncStatus: "local",
    createdAt: now,
    updatedAt: now,
  };
  await db.groups.bulkPut([group1, group2]);

  // ─── Participants ─────────────────────────────────────────────────────
  // IDs defined upfront so relations can reference them
  const pId = Array.from({ length: 26 }, () => generateId());
  // [0-6]  Tongkonan Rante
  // [7-11] Tongkonan Sanggalangit
  // [12-16] Tongkonan Buntu Pune
  // [17-20] Tongkonan Ke'pe' Tinoring
  // [21-25] Tongkonan Olang

  const rel = (type: ParticipantRelation["type"], id: string): ParticipantRelation => ({ type, participantId: id });

  const participantsRaw: Omit<Participant, "syncStatus" | "createdAt" | "updatedAt">[] = [
    // ── Tongkonan Rante ──────────────────────────────────────────────────
    { id: pId[0], name: "Puang Rante",    clan: clans[0].id, role: "ancestor", gender: "male",   notes: "Leluhur pendiri" },
    { id: pId[1], name: "Ne' Tato Dena",  clan: clans[0].id, role: "head",     gender: "male",   relations: [rel("father", pId[0])] },
    { id: pId[2], name: "Indo' Sura",     clan: clans[0].id, role: "member",   gender: "female", relations: [rel("spouse", pId[1])] },
    { id: pId[3], name: "Rante Mallomo",  clan: clans[0].id, role: "member",   gender: "male",   relations: [rel("father", pId[1]), rel("mother", pId[2])] },
    { id: pId[4], name: "Sanda Bua'",     clan: clans[0].id, role: "member",   gender: "female", relations: [rel("father", pId[1]), rel("mother", pId[2])] },
    { id: pId[5], name: "Ambe' Lai",      clan: clans[0].id, role: "member",   gender: "male",   relations: [rel("father", pId[1]), rel("mother", pId[2])] },
    { id: pId[6], name: "Tandi Puang",    clan: clans[0].id, role: "member",   gender: "male",   relations: [rel("father", pId[3])] },
    // ── Tongkonan Sanggalangit ───────────────────────────────────────────
    { id: pId[7],  name: "Sanggalangit Tua", clan: clans[1].id, role: "ancestor", gender: "male" },
    { id: pId[8],  name: "Ne' Bua' Sarong",  clan: clans[1].id, role: "head",     gender: "male",   relations: [rel("father", pId[7])] },
    { id: pId[9],  name: "Indo' Mangkau",    clan: clans[1].id, role: "member",   gender: "female", relations: [rel("spouse", pId[8])] },
    { id: pId[10], name: "Ambe' Tera",       clan: clans[1].id, role: "member",   gender: "male",   relations: [rel("father", pId[8]), rel("mother", pId[9])] },
    { id: pId[11], name: "Duma Sarong",      clan: clans[1].id, role: "member",   gender: "female", relations: [rel("father", pId[8]), rel("mother", pId[9])] },
    // ── Tongkonan Buntu Pune ─────────────────────────────────────────────
    { id: pId[12], name: "Nenek Pune",  clan: clans[2].id, role: "ancestor", gender: "female" },
    { id: pId[13], name: "Ambe' Rante", clan: clans[2].id, role: "head",     gender: "male",   relations: [rel("mother", pId[12])] },
    { id: pId[14], name: "Indo' Buntu", clan: clans[2].id, role: "member",   gender: "female", relations: [rel("spouse", pId[13])] },
    { id: pId[15], name: "Pune Malim",  clan: clans[2].id, role: "member",   gender: "male",   relations: [rel("father", pId[13]), rel("mother", pId[14])] },
    { id: pId[16], name: "Rante Pune",  clan: clans[2].id, role: "member",   gender: "male",   relations: [rel("father", pId[13]), rel("mother", pId[14])] },
    // ── Tongkonan Ke'pe' Tinoring ────────────────────────────────────────
    { id: pId[17], name: "Tinoring Lama",   clan: clans[3].id, role: "ancestor", gender: "male" },
    { id: pId[18], name: "Ne' Kepe' Bua'",  clan: clans[3].id, role: "head",     gender: "male",   relations: [rel("father", pId[17])] },
    { id: pId[19], name: "Indo' Tinoring",  clan: clans[3].id, role: "member",   gender: "female", relations: [rel("spouse", pId[18])] },
    { id: pId[20], name: "Ambe' Kepe'",     clan: clans[3].id, role: "member",   gender: "male",   relations: [rel("father", pId[18]), rel("mother", pId[19])] },
    // ── Tongkonan Olang ──────────────────────────────────────────────────
    { id: pId[21], name: "Olang Puang",    clan: clans[4].id, role: "ancestor", gender: "male" },
    { id: pId[22], name: "Ne' Olang Sura'",clan: clans[4].id, role: "head",     gender: "male",   relations: [rel("father", pId[21])] },
    { id: pId[23], name: "Indo' Sesean",   clan: clans[4].id, role: "member",   gender: "female", relations: [rel("spouse", pId[22])] },
    { id: pId[24], name: "Ambe' Olang",    clan: clans[4].id, role: "member",   gender: "male",   relations: [rel("father", pId[22]), rel("mother", pId[23])] },
    { id: pId[25], name: "Sura' Olang",    clan: clans[4].id, role: "member",   gender: "female", relations: [rel("father", pId[22]), rel("mother", pId[23])] },
  ];
  const participants: Participant[] = participantsRaw.map((p) => ({
    ...p,
    syncStatus: "local" as const,
    createdAt: now,
    updatedAt: now,
  }));
  await db.participants.bulkPut(participants);

  // ─── Loans ────────────────────────────────────────────────────────────
  const loansData: Loan[] = [
    {
      id: generateId(),
      lender: clans[0].id,
      borrower: clans[1].id,
      loanType: "animal",
      animalType: animals[0].id,
      quantity: 2,
      event: "Rambu Solo' Nenek Lai",
      dateIssued: "2024-03-15",
      status: "active",
      group: group1.id,
      witnesses: [elders[0].id],
      repayments: [],
      calculatedPrincipalValue: 500_000_000,
      remainingValue: 500_000_000,
      summary: "2 × Tedong Bonga ≈ Rp 500.000.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      lender: clans[2].id,
      borrower: clans[0].id,
      loanType: "money",
      moneyAmount: 50_000_000,
      event: "Rambu Solo' Nenek Lai",
      dateIssued: "2024-03-15",
      status: "active",
      group: group1.id,
      witnesses: [elders[1].id],
      repayments: [],
      calculatedPrincipalValue: 50_000_000,
      remainingValue: 50_000_000,
      summary: "Money Loan Rp 50.000.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      lender: clans[3].id,
      borrower: clans[1].id,
      loanType: "animal",
      animalType: animals[2].id,
      quantity: 1,
      event: "Rambu Tuka' Anto",
      dateIssued: "2024-08-20",
      status: "approved",
      group: group2.id,
      witnesses: [elders[2].id],
      repayments: [],
      calculatedPrincipalValue: 80_000_000,
      remainingValue: 80_000_000,
      summary: "1 × Tedong Pakpak ≈ Rp 80.000.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.loans.bulkPut(loansData);

  // ─── Receipts ─────────────────────────────────────────────────────────
  const receiptsData: Receipt[] = [
    {
      id: generateId(),
      group: group1.id,
      receiver: clans[0].id,
      giver: clans[4].id,
      obligationType: "funeral",
      assetType: "animal",
      animalType: animals[4].id,
      quantity: 3,
      dateReceived: "2024-03-16",
      settlementStatus: "pending",
      witnesses: [elders[0].id],
      calculatedValue: 7_500_000,
      summary: "3 × Babi Tana ≈ Rp 7.500.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      group: group1.id,
      receiver: clans[0].id,
      giver: clans[3].id,
      obligationType: "funeral",
      assetType: "money",
      moneyAmount: 10_000_000,
      dateReceived: "2024-03-16",
      settlementStatus: "settled",
      witnesses: [elders[1].id],
      calculatedValue: 10_000_000,
      summary: "Rp 10.000.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.receipts.bulkPut(receiptsData);

  // ─── Handovers ────────────────────────────────────────────────────────
  const handoversData: Handover[] = [
    {
      id: generateId(),
      group: group2.id,
      fromClan: clans[1].id,
      toClan: clans[3].id,
      obligationType: "wedding",
      assetType: "animal",
      animalType: animals[1].id,
      quantity: 1,
      date: "2024-08-21",
      witnesses: [elders[1].id],
      calculatedValue: 120_000_000,
      summary: "1 × Tedong Saleko ≈ Rp 120.000.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      group: group2.id,
      fromClan: clans[4].id,
      toClan: clans[3].id,
      obligationType: "wedding",
      assetType: "money",
      moneyAmount: 15_000_000,
      date: "2024-08-21",
      witnesses: [elders[2].id],
      calculatedValue: 15_000_000,
      summary: "Rp 15.000.000",
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.handovers.bulkPut(handoversData);

  console.log("🌱 Demo seeding complete!");
  console.log("  � Admin: admin@passura.local / passura123");
  console.log("  �👴 Elder: rante-ne-tato-dena@passura.local / elder123");
  return true;
}

