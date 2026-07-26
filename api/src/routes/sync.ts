import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { gt, eq, and, asc } from "drizzle-orm";
import {
  clans, elders, participants, groups, animalTypes,
  loans, receipts, handovers, obligations, syncLog,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

export const syncRoutes = new Hono<{ Bindings: Env }>();
syncRoutes.use("*", requireAuth);

const PULL_LIMIT = 500;

// ─── Entity table map ────────────────────────────────────────────────────────

const ENTITY_TABLES = {
  clans,
  elders,
  participants,
  groups,
  animalTypes: animalTypes,
  "animal-types": animalTypes,
  loans,
  receipts,
  handovers,
  obligations,
} as const;

type EntityType = keyof typeof ENTITY_TABLES;

// ─── POST /push — receive client changes ─────────────────────────────────────

interface PushEntry {
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
}

syncRoutes.post("/push", async (c) => {
  const body = await c.req.json<{ entries: PushEntry[] }>().catch(() => null);
  if (!body?.entries || !Array.isArray(body.entries)) {
    return c.json({ error: "entries array required" }, 400);
  }

  if (body.entries.length > 200) {
    return c.json({ error: "Max 200 entries per push" }, 400);
  }

  const db = drizzle(c.env.DB);
  const now = Math.floor(Date.now() / 1000);
  const accepted: string[] = [];
  const rejected: { id: string; reason: string }[] = [];

  for (const entry of body.entries) {
    if (!entry.entityType || !entry.entityId || !entry.action || !entry.data) {
      rejected.push({ id: entry.entityId ?? "unknown", reason: "malformed_entry" });
      continue;
    }

    const tableKey = entry.entityType as EntityType;
    const table = ENTITY_TABLES[tableKey];
    if (!table) {
      rejected.push({ id: entry.entityId, reason: "unknown_entity_type" });
      continue;
    }

    try {
      if (entry.action === "delete") {
        await (db.delete(table) as any).where(eq((table as any).id, entry.entityId));
      } else if (entry.action === "create") {
        const row = normalizeRow(entry.entityType, { ...entry.data, id: entry.entityId, syncStatus: "synced", updatedAt: now, createdAt: entry.data.createdAt ?? now });
        await (db.insert(table) as any).values(row).onConflictDoUpdate({
          target: (table as any).id,
          set: { ...row, syncStatus: "synced", updatedAt: now },
        });
      } else {
        // update
        const row = normalizeRow(entry.entityType, { ...entry.data, syncStatus: "synced", updatedAt: now });
        await (db.update(table) as any)
          .set(row)
          .where(eq((table as any).id, entry.entityId));
      }

      // Log to syncLog
      await db.insert(syncLog).values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        data: JSON.stringify(entry.data),
        syncStatus: "synced",
        createdAt: now,
      });

      accepted.push(entry.entityId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rejected.push({ id: entry.entityId, reason: msg.includes("UNIQUE") ? "conflict" : "internal_error" });
    }
  }

  return c.json({
    accepted: accepted.length,
    rejected,
    serverCursor: String(now),
  });
});

// ─── GET /pull — send server changes to client ───────────────────────────────

syncRoutes.get("/pull", async (c) => {
  const db = drizzle(c.env.DB);
  const since = parseInt(c.req.query("since") ?? "0", 10);

  const tables = [
    { key: "clans", table: clans },
    { key: "elders", table: elders },
    { key: "participants", table: participants },
    { key: "groups", table: groups },
    { key: "animalTypes", table: animalTypes },
    { key: "loans", table: loans },
    { key: "receipts", table: receipts },
    { key: "handovers", table: handovers },
    { key: "obligations", table: obligations },
  ] as const;

  const result: Record<string, { data: unknown[]; hasMore: boolean }> = {};

  for (const { key, table } of tables) {
    const rows = await (db.select() as any)
      .from(table)
      .where(gt((table as any).updatedAt, since))
      .orderBy(asc((table as any).updatedAt))
      .limit(PULL_LIMIT)
      .all();

    result[key] = {
      data: rows.map((r: any) => denormalizeRow(key, r)),
      hasMore: rows.length >= PULL_LIMIT,
    };
  }

  return c.json({
    entities: result,
    serverCursor: String(Math.floor(Date.now() / 1000)),
  });
});

// ─── JSON <→ DB field normalization ─────────────────────────────────────────

/**
 * Convert camelCase Dexie entity fields to snake_case D1 columns.
 * Arrays (members, witnesses, repayments) are serialized to JSON strings.
 */
function normalizeRow(entityType: string, data: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = { ...data };

  // Serialize JSON array fields
  for (const key of ["members", "witnesses", "repayments"]) {
    if (Array.isArray(row[key])) {
      row[key] = JSON.stringify(row[key]);
    }
  }

  // Map camelCase to snake_case for columns that differ
  const renames: Record<string, string> = {
    loanType: "loan_type",
    animalType: "animal_type",
    moneyAmount: "money_amount",
    dateIssued: "date_issued",
    calculatedPrincipalValue: "calculated_principal_value",
    remainingValue: "remaining_value",
    syncStatus: "sync_status",
    createdAt: "created_at",
    updatedAt: "updated_at",
    eventName: "event_name",
    dateReceived: "date_received",
    settlementStatus: "settlement_status",
    fromClan: "from_clan",
    toClan: "to_clan",
    obligationType: "obligation_type",
    paymentType: "payment_type",
    calculatedValue: "calculated_value",
    lineageHead: "lineage_head",
    geneticLine: "genetic_line",
    passwordHash: "password_hash",
  };

  for (const [from, to] of Object.entries(renames)) {
    if (from in row) {
      row[to] = row[from];
      delete row[from];
    }
  }

  return row;
}

/**
 * Convert DB row (snake_case, JSON strings) back to camelCase Dexie entity format.
 */
function denormalizeRow(entityType: string, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };

  // Parse JSON array fields
  for (const key of ["members", "witnesses", "repayments"]) {
    if (typeof out[key] === "string") {
      try { out[key] = JSON.parse(out[key] as string); }
      catch { out[key] = []; }
    }
  }

  // Map snake_case → camelCase
  const renames: Record<string, string> = {
    loan_type: "loanType",
    animal_type: "animalType",
    money_amount: "moneyAmount",
    date_issued: "dateIssued",
    calculated_principal_value: "calculatedPrincipalValue",
    remaining_value: "remainingValue",
    sync_status: "syncStatus",
    created_at: "createdAt",
    updated_at: "updatedAt",
    event_name: "eventName",
    date_received: "dateReceived",
    settlement_status: "settlementStatus",
    from_clan: "fromClan",
    to_clan: "toClan",
    obligation_type: "obligationType",
    payment_type: "paymentType",
    calculated_value: "calculatedValue",
    lineage_head: "lineageHead",
    genetic_line: "geneticLine",
    password_hash: "passwordHash",
  };

  for (const [from, to] of Object.entries(renames)) {
    if (from in out) {
      out[to] = out[from];
      delete out[from];
    }
  }

  return out;
}
