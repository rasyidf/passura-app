/**
 * API tenant isolation property tests.
 *
 * Tests Properties 5, 6, 7, and 8 from the design's Correctness Properties section.
 *
 * These tests use Hono's app.request() helper with an in-memory D1 stub so they
 * run inside the standard vitest/jsdom environment without Cloudflare Workers.
 *
 * Validates:
 *   - Property 5: JWT tenant claim matches elder's stored tenantId
 *   - Property 6: Server writes JWT tenant_id onto every pushed row
 *   - Property 7: Cross-tenant delete isolation
 *   - Property 8: Pull filters to requesting tenant only
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Hono } from "hono";
import { authRoutes } from "../routes/auth";
import { syncRoutes } from "../routes/sync";
import { signJwt } from "../lib/auth";

// ─── In-memory D1 stub ────────────────────────────────────────────────────────
//
// Drizzle's D1 adapter calls three methods on a prepared statement's bound result:
//   .run()  — mutations (INSERT/UPDATE/DELETE)
//   .all()  — SELECT returning all rows as { results: Row[] }
//   .raw()  — SELECT returning all rows as unknown[][] (array-of-arrays)
//
// We implement a tiny query engine that parses SQL patterns used by the routes.

type Row = Record<string, unknown>;

interface D1Result<T = Row> {
  results: T[];
  success: boolean;
  meta: { changes: number };
}

/** Bound statement — returned by D1PreparedStatement.bind() */
class BoundStmt {
  constructor(
    private db: D1Stub,
    private sql: string,
    private bindings: unknown[],
  ) {}

  async run(): Promise<{ success: boolean; meta: { changes: number } }> {
    const affected = this.db._mutate(this.sql, this.bindings);
    return { success: true, meta: { changes: affected } };
  }

  async all<T = Row>(): Promise<D1Result<T>> {
    const rows = this.db._select(this.sql, this.bindings) as T[];
    return { results: rows, success: true, meta: { changes: 0 } };
  }

  /** Returns rows as array-of-arrays; column order matches SELECT clause */
  async raw<T = unknown[]>(): Promise<T[]> {
    const rows = this.db._select(this.sql, this.bindings);
    // Drizzle uses raw() to get values in column order
    return rows.map((row) => Object.values(row)) as T[];
  }

  async first<T = Row>(): Promise<T | null> {
    const rows = this.db._select(this.sql, this.bindings);
    return (rows[0] as T) ?? null;
  }
}

/** Prepared statement — returned by D1Database.prepare() */
class PreparedStmt {
  constructor(
    private db: D1Stub,
    private sql: string,
  ) {}

  bind(...values: unknown[]): BoundStmt {
    return new BoundStmt(this.db, this.sql, values);
  }

  // Convenience: call without bind
  async run() { return this.bind().run(); }
  async all<T = Row>() { return this.bind().all<T>(); }
  async first<T = Row>() { return this.bind().first<T>(); }
  async raw<T = unknown[]>() { return this.bind().raw<T>(); }
}

class D1Stub {
  private tables: Map<string, Row[]> = new Map();
  public mutations: Array<{ type: string; table: string; row?: Row }> = [];

  /** Seed a table with initial rows */
  seedTable(name: string, rows: Row[]) {
    this.tables.set(name.toLowerCase(), rows.map((r) => ({ ...r })));
  }

  getTable(name: string): Row[] {
    return this.tables.get(name.toLowerCase()) ?? [];
  }

  // ── D1Database interface ────────────────────────────────────────────────

  prepare(sql: string): PreparedStmt {
    return new PreparedStmt(this, sql);
  }

  async exec(_sql: string): Promise<{ count: number; duration: number }> {
    return { count: 0, duration: 0 };
  }

  async batch<T = unknown>(_stmts: unknown[]): Promise<D1Result<T>[]> {
    return [];
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  // ── Internal query engine ───────────────────────────────────────────────

  _select(sql: string, bindings: unknown[]): Row[] {
    const tableName = this._table(sql, "from");
    const rows = this.tables.get(tableName) ?? [];
    const filtered = this._where(rows, sql, bindings);

    // Apply ORDER BY (simple — single column)
    const orderMatch = sql.match(/ORDER BY\s+"?(\w+)"?\s+(ASC|DESC)?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const desc = (orderMatch[2] ?? "ASC").toUpperCase() === "DESC";
      filtered.sort((a, b) => {
        const av = a[col] as number;
        const bv = b[col] as number;
        return desc ? bv - av : av - bv;
      });
    }

    // Apply LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : Infinity;
    return filtered.slice(0, limit);
  }

  _mutate(sql: string, bindings: unknown[]): number {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith("INSERT")) return this._insert(sql, bindings);
    if (upper.startsWith("UPDATE")) return this._update(sql, bindings);
    if (upper.startsWith("DELETE")) return this._delete(sql, bindings);
    return 0;
  }

  // ── Table name extraction ───────────────────────────────────────────────

  private _table(sql: string, keyword: "from" | "into" | "update" | "delete from"): string {
    const patterns: Record<string, RegExp> = {
      from:         /FROM\s+"?(\w+)"?/i,
      into:         /INTO\s+"?(\w+)"?/i,
      update:       /UPDATE\s+"?(\w+)"?/i,
      "delete from":/DELETE\s+FROM\s+"?(\w+)"?/i,
    };
    return (sql.match(patterns[keyword])?.[1] ?? "").toLowerCase();
  }

  // ── WHERE clause evaluation ─────────────────────────────────────────────

  private _where(rows: Row[], sql: string, bindings: unknown[]): Row[] {
    // Strip ON CONFLICT... suffix before looking for WHERE
    const cleanSql = sql.replace(/ON CONFLICT[\s\S]*/i, "");
    const whereMatch = cleanSql.match(/WHERE\s+([\s\S]+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (!whereMatch) return [...rows];
    const conditions = this._conds(whereMatch[1], bindings);
    return rows.filter((row) => this._match(row, conditions));
  }

  private _conds(clause: string, bindings: unknown[]) {
    const conds: Array<{ col: string; op: string; val: unknown }> = [];
    const re = /"?(\w+)"?\s*(=|!=|<>|>=|<=|>|<)\s*\?/g;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(clause)) !== null) {
      conds.push({ col: m[1], op: m[2], val: bindings[i++] });
    }
    return conds;
  }

  private _match(row: Row, conds: Array<{ col: string; op: string; val: unknown }>): boolean {
    return conds.every(({ col, op, val }) => {
      const v = row[col];
      switch (op) {
        case "=":  return v === val;
        case "!=":
        case "<>": return v !== val;
        case ">":  return (v as number) > (val as number);
        case "<":  return (v as number) < (val as number);
        case ">=": return (v as number) >= (val as number);
        case "<=": return (v as number) <= (val as number);
        default:   return true;
      }
    });
  }

  // ── INSERT ──────────────────────────────────────────────────────────────

  private _insert(sql: string, bindings: unknown[]): number {
    const tableName = this._table(sql, "into");
    if (!this.tables.has(tableName)) this.tables.set(tableName, []);

    // Extract column names from INSERT INTO t (col1, col2, ...) VALUES (...)
    const colMatch = sql.match(/\(([^)]+)\)\s*values/i);
    if (!colMatch) return 0;

    const cols = colMatch[1].split(",").map((c) => c.trim().replace(/"/g, ""));

    // Extract the VALUES clause to determine which positions are `?` vs literal `null`
    // VALUES (?, ?, null, null, ?, ?, null, null)
    const valuesMatch = sql.match(/values\s*\(([^)]+)\)/i);
    if (!valuesMatch) return 0;

    const valuePlaceholders = valuesMatch[1].split(",").map((v) => v.trim().toLowerCase());

    // Map each column to either its binding (for `?`) or null (for literal `null`)
    const row: Row = {};
    let bindIdx = 0;
    for (let i = 0; i < cols.length; i++) {
      const placeholder = valuePlaceholders[i];
      if (placeholder === "?") {
        row[cols[i]] = bindings[bindIdx++];
      } else if (placeholder === "null") {
        row[cols[i]] = null;
      } else {
        row[cols[i]] = placeholder; // other literals (rare)
      }
    }

    const isUpsert = /ON CONFLICT/i.test(sql);
    const table = this.tables.get(tableName)!;
    const existingIdx = row["id"] !== undefined ? table.findIndex((r) => r["id"] === row["id"]) : -1;

    if (isUpsert && existingIdx >= 0) {
      // ON CONFLICT DO UPDATE SET — bindings for SET come after VALUES bindings
      // bindIdx now points to the start of SET bindings
      const setMatch = sql.match(/DO UPDATE SET\s+([\s\S]+?)(?:\s*$)/i);
      if (setMatch) {
        const setCols = this._parseSet(setMatch[1]);
        setCols.forEach((col) => {
          (table[existingIdx] as Row)[col] = bindings[bindIdx++];
        });
      } else {
        Object.assign(table[existingIdx], row);
      }
    } else {
      table.push({ ...row });
    }

    this.mutations.push({ type: "insert", table: tableName, row });
    return 1;
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────

  private _update(sql: string, bindings: unknown[]): number {
    const tableName = this._table(sql, "update");
    const table = this.tables.get(tableName);
    if (!table) return 0;

    const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s*$)/i);
    if (!setMatch) return 0;

    const setCols = this._parseSet(setMatch[1]);
    const setVals = bindings.slice(0, setCols.length);
    const whereBindings = bindings.slice(setCols.length);
    const conditions = whereMatch ? this._conds(whereMatch[1], whereBindings) : [];

    let count = 0;
    for (const row of table) {
      if (this._match(row, conditions)) {
        setCols.forEach((col, i) => { (row as Record<string, unknown>)[col] = setVals[i]; });
        count++;
      }
    }

    if (count > 0) this.mutations.push({ type: "update", table: tableName });
    return count;
  }

  // ── DELETE ──────────────────────────────────────────────────────────────

  private _delete(sql: string, bindings: unknown[]): number {
    const tableName = this._table(sql, "delete from");
    const table = this.tables.get(tableName);
    if (!table) return 0;

    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s*$)/i);
    const conditions = whereMatch ? this._conds(whereMatch[1], bindings) : [];

    const before = table.length;
    const remaining = table.filter((row) => !this._match(row, conditions));
    this.tables.set(tableName, remaining);

    const deleted = before - remaining.length;
    if (deleted > 0) this.mutations.push({ type: "delete", table: tableName });
    return deleted;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private _parseSet(setClauses: string): string[] {
    return setClauses
      .split(",")
      .map((s) => s.trim())
      .map((s) => {
        const eqIdx = s.indexOf("=");
        return s.substring(0, eqIdx).trim().replace(/"/g, "");
      })
      .filter(Boolean);
  }
}

// ─── Test app factory ─────────────────────────────────────────────────────────

const JWT_SECRET = "test-secret-for-api-property-tests";

function buildTestApp(db: D1Stub) {
  const app = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();
  app.use("*", async (c, next) => {
    // Inject test environment bindings — c.env may be undefined in test context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = c as unknown as { env?: Record<string, unknown> };
    if (!raw.env) raw.env = {};
    raw.env["DB"] = db as unknown as D1Database;
    raw.env["JWT_SECRET"] = JWT_SECRET;
    await next();
  });
  app.route("/api/auth", authRoutes);
  app.route("/api/sync", syncRoutes);
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function makeToken(payload: { elderId: string; email: string; role: string; tenantId: string }) {
  return signJwt(payload, JWT_SECRET);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

/** Hash a password with a given salt using PBKDF2-SHA256 (same as the API) */
async function hashPassword(password: string, saltHex: string): Promise<string> {
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100_000, hash: "SHA-256" },
    keyMaterial, 256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Non-empty, non-whitespace-only string that is a reasonable tenant ID */
const arbTenantId = fc
  .string({ minLength: 4, maxLength: 36 })
  .filter((s) => s.trim().length > 0 && !s.includes("\x00"));

/** Valid entity ID (UUID-like) */
const arbEntityId = fc
  .string({ minLength: 4, maxLength: 36 })
  .filter((s) => s.trim().length > 0 && !s.includes("\x00"));

// ─── Property 5: JWT tenant claim matches elder's stored tenantId ─────────────
// Validates: Requirements 3.8, 3.9, 3.10

describe("Property 5: JWT tenant claim matches elder's stored tenantId", () => {
  const SALT_HEX = "aabbccdd11223344aabbccdd11223344"; // 16 bytes as hex
  const PASSWORD = "password123";

  it("login with elder having non-empty tenantId returns JWT with matching tenantId claim", async () => {
    const passwordHash = await hashPassword(PASSWORD, SALT_HEX);

    await fc.assert(
      fc.asyncProperty(arbTenantId, async (tenantId) => {
        const db = new D1Stub();
        db.seedTable("elders", [
          {
            id: "elder-1",
            name: "Test Elder",
            email: "test@example.com",
            password_hash: passwordHash,
            salt: SALT_HEX,
            clan: null,
            role: "superadmin",
            sync_status: "synced",
            tenant_id: tenantId,
            created_at: 0,
            updated_at: 0,
          },
        ]);

        const app = buildTestApp(db);

        const res = await app.request("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com", password: PASSWORD }),
        });

        expect(res.status).toBe(200);
        const body = await res.json<{ token: string }>();
        expect(typeof body.token).toBe("string");

        // The JWT tenantId claim must exactly match the elder's stored tenant_id
        const payload = decodeJwtPayload(body.token);
        expect(payload).not.toBeNull();
        expect(payload!["tenantId"]).toBe(tenantId);
      }),
      { numRuns: 8 },
    );
  });

  it("login with elder having null/empty tenant_id returns 403 (Requirement 3.10)", async () => {
    const passwordHash = await hashPassword(PASSWORD, SALT_HEX);

    const db = new D1Stub();
    db.seedTable("elders", [
      {
        id: "elder-2",
        name: "No Tenant Elder",
        email: "notenant@example.com",
        password_hash: passwordHash,
        salt: SALT_HEX,
        clan: null,
        role: "validator",
        sync_status: "synced",
        tenant_id: "", // empty tenant
        created_at: 0,
        updated_at: 0,
      },
    ]);

    const app = buildTestApp(db);

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "notenant@example.com", password: PASSWORD }),
    });

    // Requirement 3.10: no tenantId → 403, no JWT issued
    expect(res.status).toBe(403);
  });
});

// ─── Property 6: Server writes JWT tenant_id onto every pushed row ────────────
// Validates: Requirement 3.3

describe("Property 6: Server writes JWT tenant_id onto every pushed row", () => {
  it("push create always writes the JWT tenantId to the row, ignoring body tenantId", async () => {
    await fc.assert(
      fc.asyncProperty(arbTenantId, arbTenantId, arbEntityId, async (jwtTenantId, bodyTenantId, entityId) => {
        // The property is specifically about cases where they differ
        fc.pre(jwtTenantId !== bodyTenantId);

        const db = new D1Stub();
        db.seedTable("clans", []);
        db.seedTable("sync_log", []);

        const token = await makeToken({ elderId: "e1", email: "t@t.com", role: "superadmin", tenantId: jwtTenantId });
        const app = buildTestApp(db);

        const res = await app.request("/api/sync/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tenantId: bodyTenantId, // client sends its own tenantId
            entries: [{
              entityType: "clans",
              entityId,
              action: "create",
              data: { id: entityId, name: "Test Clan", tenantId: bodyTenantId },
              timestamp: 1000,
            }],
          }),
        });

        expect(res.status).toBe(200);
        const body = await res.json<{ results: Array<{ id: string; status: string }> }>();
        expect(body.results[0].status).toBe("synced");

        // Row must carry the JWT tenant_id, NOT the body tenantId
        const clanRows = db.getTable("clans");
        const written = clanRows.find((r) => r["id"] === entityId);
        expect(written).toBeDefined();
        expect(written!["tenant_id"]).toBe(jwtTenantId);
        // And it must NOT be the body's tenantId
        expect(written!["tenant_id"]).not.toBe(bodyTenantId);
      }),
      { numRuns: 10 },
    );
  });

  it("push with absent or empty tenantId in body returns 400 (Requirement 3.1)", async () => {
    await fc.assert(
      fc.asyncProperty(arbTenantId, arbEntityId, async (jwtTenantId, entityId) => {
        const db = new D1Stub();
        db.seedTable("clans", []);

        const token = await makeToken({ elderId: "e1", email: "t@t.com", role: "superadmin", tenantId: jwtTenantId });
        const app = buildTestApp(db);

        // Missing tenantId
        const r1 = await app.request("/api/sync/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            entries: [{ entityType: "clans", entityId, action: "create", data: {}, timestamp: 0 }],
          }),
        });
        expect(r1.status).toBe(400);

        // Empty/whitespace tenantId
        const r2 = await app.request("/api/sync/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tenantId: "   ",
            entries: [{ entityType: "clans", entityId, action: "create", data: {}, timestamp: 0 }],
          }),
        });
        expect(r2.status).toBe(400);
      }),
      { numRuns: 5 },
    );
  });
});

// ─── Property 7: Cross-tenant delete isolation ───────────────────────────────
// Validates: Requirement 3.4

describe("Property 7: Cross-tenant delete isolation", () => {
  it("delete push from tenant B does not remove tenant A rows", async () => {
    await fc.assert(
      fc.asyncProperty(arbTenantId, arbTenantId, arbEntityId, async (tenantA, tenantB, entityId) => {
        fc.pre(tenantA !== tenantB);

        const db = new D1Stub();
        db.seedTable("clans", [
          { id: entityId, name: "Tenant A Clan", region: null, lineage_head: null, sync_status: "synced", tenant_id: tenantA, created_at: 0, updated_at: 0 },
        ]);
        db.seedTable("sync_log", []);

        const tokenB = await makeToken({ elderId: "eb", email: "b@t.com", role: "superadmin", tenantId: tenantB });
        const app = buildTestApp(db);

        const res = await app.request("/api/sync/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
          body: JSON.stringify({
            tenantId: tenantB,
            entries: [{ entityType: "clans", entityId, action: "delete", data: {}, timestamp: 0 }],
          }),
        });

        expect(res.status).toBe(200);

        // Tenant A's row must be intact
        const rows = db.getTable("clans");
        const tenantARow = rows.find((r) => r["id"] === entityId);
        expect(tenantARow).toBeDefined();
        expect(tenantARow!["tenant_id"]).toBe(tenantA);
      }),
      { numRuns: 10 },
    );
  });
});

// ─── Property 8: Pull filters to requesting tenant only ──────────────────────
// Validates: Requirements 3.5, 3.6, 3.7

describe("Property 8: Pull filters to requesting tenant only", () => {
  it("pull returns 400 when tenantId query param is absent (Requirement 3.7)", async () => {
    const db = new D1Stub();
    const token = await makeToken({ elderId: "e1", email: "e@t.com", role: "superadmin", tenantId: "tenant-x" });
    const app = buildTestApp(db);

    const res = await app.request("/api/sync/pull?since=0", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(400);
  });

  it("pull returns 403 when tenantId param differs from JWT claim (Requirement 3.5)", async () => {
    await fc.assert(
      fc.asyncProperty(arbTenantId, arbTenantId, async (jwtTenantId, queryTenantId) => {
        fc.pre(jwtTenantId !== queryTenantId);

        const db = new D1Stub();
        const token = await makeToken({ elderId: "e1", email: "e@t.com", role: "superadmin", tenantId: jwtTenantId });
        const app = buildTestApp(db);

        const res = await app.request(
          `/api/sync/pull?since=0&tenantId=${encodeURIComponent(queryTenantId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        expect(res.status).toBe(403);
      }),
      { numRuns: 10 },
    );
  });

  it("pull returns only rows belonging to the requesting tenant (Requirement 3.6)", async () => {
    await fc.assert(
      fc.asyncProperty(arbTenantId, arbTenantId, async (tenantA, tenantB) => {
        fc.pre(tenantA !== tenantB);

        const db = new D1Stub();

        db.seedTable("clans", [
          { id: "clan-a1", name: "Clan A1", region: null, lineage_head: null, sync_status: "synced", tenant_id: tenantA, created_at: 0, updated_at: 1 },
          { id: "clan-a2", name: "Clan A2", region: null, lineage_head: null, sync_status: "synced", tenant_id: tenantA, created_at: 0, updated_at: 1 },
          { id: "clan-b1", name: "Clan B1", region: null, lineage_head: null, sync_status: "synced", tenant_id: tenantB, created_at: 0, updated_at: 1 },
        ]);

        for (const t of ["elders", "participants", "groups", "animal_types", "loans", "receipts", "handovers", "obligations"]) {
          db.seedTable(t, []);
        }

        const token = await makeToken({ elderId: "e1", email: "e@t.com", role: "superadmin", tenantId: tenantA });
        const app = buildTestApp(db);

        const res = await app.request(
          `/api/sync/pull?since=0&tenantId=${encodeURIComponent(tenantA)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        expect(res.status).toBe(200);
        const body = await res.json<{ entities: { clans: { data: Array<{ id: string }> } } }>();

        const returnedIds = body.entities.clans.data.map((r) => r.id);
        expect(returnedIds).toContain("clan-a1");
        expect(returnedIds).toContain("clan-a2");
        expect(returnedIds).not.toContain("clan-b1");
      }),
      { numRuns: 5 },
    );
  });
});
