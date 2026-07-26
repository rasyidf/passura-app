import { db } from "./local-db";
import { generateId, hashPassword } from "@/auth/local-auth";
import type {
  Clan,
  Elder,
  AnimalType,
  Group,
  Loan,
  Receipt,
  Handover,
} from "./types";

/**
 * Seeds demo data into IndexedDB on first run (when no elders exist).
 */
export async function seedIfEmpty(): Promise<boolean> {
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
  await db.animalTypes.bulkAdd(animals);

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
  await db.clans.bulkAdd(clans);

  // ─── Elders ───────────────────────────────────────────────────────────
  const { hash: elderHash, salt: elderSalt } = await hashPassword("elder123");
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
  await db.elders.bulkAdd(elders);

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
  await db.groups.bulkAdd([group1, group2]);

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
  await db.loans.bulkAdd(loansData);

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
  await db.receipts.bulkAdd(receiptsData);

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
  await db.handovers.bulkAdd(handoversData);

  console.log("🌱 Demo seeding complete!");
  console.log("  👴 Elder: rante-ne-tato-dena@passura.local / elder123");
  return true;
}
