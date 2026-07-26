/**
 * Generic CRUD routes for all Passura entities.
 * Mounted at /api/:entity — supports GET (list), GET/:id, POST, PATCH/:id, DELETE/:id.
 */
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import {
  clans, elders, participants, groups, animalTypes,
  loans, receipts, handovers, obligations,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string };

const TABLE_MAP = {
  clans,
  elders,
  participants,
  groups,
  "animal-types": animalTypes,
  loans,
  receipts,
  handovers,
  obligations,
} as const;

type EntityName = keyof typeof TABLE_MAP;

function getTable(entity: string) {
  return TABLE_MAP[entity as EntityName] ?? null;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

export const entityRoutes = new Hono<{ Bindings: Env }>();

// All entity routes require auth
entityRoutes.use("*", requireAuth);

// ─── GET /api/:entity ────────────────────────────────────────────────────────
entityRoutes.get("/:entity", async (c) => {
  const table = getTable(c.req.param("entity"));
  if (!table) return c.json({ error: "Unknown entity" }, 404);

  const db = drizzle(c.env.DB);
  const rows = await (db.select() as any).from(table).all();
  return c.json({ docs: rows, totalDocs: rows.length });
});

// ─── GET /api/:entity/:id ────────────────────────────────────────────────────
entityRoutes.get("/:entity/:id", async (c) => {
  const table = getTable(c.req.param("entity"));
  if (!table) return c.json({ error: "Unknown entity" }, 404);

  const db = drizzle(c.env.DB);
  const row = await (db.select() as any).from(table).where(eq((table as any).id, c.req.param("id"))).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// ─── POST /api/:entity ───────────────────────────────────────────────────────
entityRoutes.post("/:entity", async (c) => {
  const table = getTable(c.req.param("entity"));
  if (!table) return c.json({ error: "Unknown entity" }, 404);

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const db = drizzle(c.env.DB);
  const ts = now();
  const id = crypto.randomUUID();
  const row = { ...body, id, syncStatus: "synced", createdAt: ts, updatedAt: ts };

  await (db.insert(table) as any).values(row);
  return c.json(row, 201);
});

// ─── PATCH /api/:entity/:id ──────────────────────────────────────────────────
entityRoutes.patch("/:entity/:id", async (c) => {
  const table = getTable(c.req.param("entity"));
  if (!table) return c.json({ error: "Unknown entity" }, 404);

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const db = drizzle(c.env.DB);
  const ts = now();
  const updates = { ...body, updatedAt: ts, syncStatus: "synced" };

  await (db.update(table) as any).set(updates).where(eq((table as any).id, c.req.param("id")));
  const updated = await (db.select() as any).from(table).where(eq((table as any).id, c.req.param("id"))).get();
  return c.json(updated);
});

// ─── DELETE /api/:entity/:id ─────────────────────────────────────────────────
entityRoutes.delete("/:entity/:id", requireRole("superadmin", "validator"), async (c) => {
  const table = getTable(c.req.param("entity"));
  if (!table) return c.json({ error: "Unknown entity" }, 404);

  const db = drizzle(c.env.DB);
  await (db.delete(table) as any).where(eq((table as any).id, c.req.param("id")));
  return c.json({ deleted: true });
});
