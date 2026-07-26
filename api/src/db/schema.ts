import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Clans ────────────────────────────────────────────────────────────────────
export const clans = sqliteTable("clans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region"),
  lineageHead: text("lineage_head"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Elders (auth users) ─────────────────────────────────────────────────────
export const elders = sqliteTable("elders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  clan: text("clan"),
  role: text("role").notNull().default("validator"), // "superadmin" | "validator" | "participant"
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Participants ─────────────────────────────────────────────────────────────
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clan: text("clan").notNull(),
  role: text("role").notNull().default("member"), // "head" | "member" | "ancestor"
  next: text("next"),
  notes: text("notes"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Groups ──────────────────────────────────────────────────────────────────
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  eventName: text("event_name"),
  description: text("description"),
  members: text("members").notNull().default("[]"), // JSON array of clan IDs
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Animal Types ─────────────────────────────────────────────────────────────
export const animalTypes = sqliteTable("animal_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "buffalo" | "pig"
  breed: text("breed").notNull(),
  geneticLine: text("genetic_line"),
  quality: text("quality").notNull(), // "low" | "medium" | "high" | "unique"
  price: real("price").notNull(),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Loans ───────────────────────────────────────────────────────────────────
export const loans = sqliteTable("loans", {
  id: text("id").primaryKey(),
  group: text("group"),
  lender: text("lender").notNull(),
  borrower: text("borrower").notNull(),
  loanType: text("loan_type").notNull(), // "animal" | "money"
  animalType: text("animal_type"),
  moneyAmount: real("money_amount"),
  quantity: real("quantity"),
  event: text("event").notNull(),
  dateIssued: text("date_issued").notNull(),
  status: text("status").notNull().default("requested"),
  witnesses: text("witnesses").notNull().default("[]"),   // JSON
  repayments: text("repayments").notNull().default("[]"), // JSON
  calculatedPrincipalValue: real("calculated_principal_value"),
  remainingValue: real("remaining_value"),
  notes: text("notes"),
  summary: text("summary"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Receipts ─────────────────────────────────────────────────────────────────
export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  group: text("group"),
  receiver: text("receiver").notNull(),
  giver: text("giver").notNull(),
  obligationType: text("obligation_type").notNull().default("ritual"),
  assetType: text("asset_type").notNull(),
  animalType: text("animal_type"),
  quantity: real("quantity"),
  moneyAmount: real("money_amount"),
  dateReceived: text("date_received").notNull(),
  settlementStatus: text("settlement_status").notNull().default("pending"),
  witnesses: text("witnesses").notNull().default("[]"),
  notes: text("notes"),
  calculatedValue: real("calculated_value"),
  summary: text("summary"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Handovers ────────────────────────────────────────────────────────────────
export const handovers = sqliteTable("handovers", {
  id: text("id").primaryKey(),
  group: text("group"),
  fromClan: text("from_clan").notNull(),
  toClan: text("to_clan").notNull(),
  obligationType: text("obligation_type").notNull().default("ritual"),
  assetType: text("asset_type").notNull(),
  animalType: text("animal_type"),
  quantity: real("quantity"),
  moneyAmount: real("money_amount"),
  date: text("date").notNull(),
  witnesses: text("witnesses").notNull().default("[]"),
  notes: text("notes"),
  calculatedValue: real("calculated_value"),
  summary: text("summary"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Obligations ──────────────────────────────────────────────────────────────
export const obligations = sqliteTable("obligations", {
  id: text("id").primaryKey(),
  giver: text("giver").notNull(),
  receiver: text("receiver").notNull(),
  paymentType: text("payment_type").notNull(),
  animalType: text("animal_type"),
  moneyAmount: real("money_amount"),
  quantity: real("quantity").notNull(),
  event: text("event").notNull(),
  date: text("date").notNull(),
  witnesses: text("witnesses").notNull().default("[]"),
  calculatedValue: real("calculated_value"),
  summary: text("summary"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Sync Log ─────────────────────────────────────────────────────────────────
export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // "create" | "update" | "delete"
  data: text("data").notNull().default("{}"), // JSON
  syncStatus: text("sync_status").notNull().default("pending"),
  deviceId: text("device_id"),
  createdAt: integer("created_at").notNull(),
});
