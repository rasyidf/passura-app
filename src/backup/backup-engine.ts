import { db } from "@/db/local-db";
import type { BackupFile, ExportResult, ImportResult } from "./backup-types";

const ENTITY_TABLES = [
  "clans",
  "elders",
  "participants",
  "groups",
  "animalTypes",
  "loans",
  "receipts",
  "handovers",
  "obligations",
] as const;

type EntityTableName = (typeof ENTITY_TABLES)[number];

/**
 * Reads all 9 entity tables from the local Dexie database and builds a
 * portable BackupFile. Timestamps are stored as integers via Math.trunc.
 * Throws on any Dexie read error — the caller is responsible for the
 * error toast and preventing the file download.
 *
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.7
 */
export async function exportBackup(tenantId: string): Promise<ExportResult> {
  const entities = {} as BackupFile["entities"];
  const counts: Record<string, number> = {};

  for (const table of ENTITY_TABLES) {
    // toArray() throws if Dexie encounters a read error — let it propagate
    const records = await db[table as EntityTableName].toArray();

    // Ensure all numeric timestamps are integers, not floats
    const sanitized = records.map((r) => ({
      ...r,
      createdAt: Math.trunc(r.createdAt),
      updatedAt: Math.trunc(r.updatedAt),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entities as Record<EntityTableName, unknown[]>)[table] = sanitized;
    counts[table] = sanitized.length;
  }

  const backup: BackupFile = {
    version: 1,
    tenantId,
    exportedAt: new Date().toISOString(),
    entities,
  };

  return { backup, counts };
}

/**
 * Validates a File before any Dexie writes take place.
 * Performs these sequential checks:
 *  1. File size ≤ 50 MB
 *  2. JSON parseable
 *  3. version === 1
 *  4. entities is a non-null object
 *
 * Returns the parsed BackupFile and a tenantMismatch flag.
 * Throws a descriptive Error on any validation failure — no Dexie writes occur.
 *
 * Requirements: 10.2, 10.3, 10.4, 10.10
 */
export async function importBackup(
  file: File,
  localTenantId: string,
): Promise<{ backup: BackupFile; tenantMismatch: boolean }> {
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

  if (file.size > MAX_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 50 MB.`,
    );
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON. Please select a valid backup file.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>)["version"] !== 1
  ) {
    const version = (parsed as Record<string, unknown>)?.["version"];
    if (version === undefined || version === null) {
      throw new Error(
        "Invalid backup file: missing 'version' field. Expected version 1.",
      );
    }
    throw new Error(
      `Invalid backup file: unsupported version '${version}'. Expected version 1.`,
    );
  }

  const obj = parsed as Record<string, unknown>;
  if (
    typeof obj["entities"] !== "object" ||
    obj["entities"] === null ||
    Array.isArray(obj["entities"])
  ) {
    throw new Error(
      "Invalid backup file: missing or malformed 'entities' object.",
    );
  }

  const backup = parsed as BackupFile;
  const tenantMismatch = backup.tenantId !== localTenantId;

  return { backup, tenantMismatch };
}

/**
 * Writes all entity records from a validated BackupFile into the local Dexie
 * database using bulkPut. Every imported record gets syncStatus set to
 * "pending" so the next sync pushes it to the server.
 *
 * On bulkPut failure for any table, returns an error result identifying the
 * failing table; successfully written tables remain intact.
 *
 * Requirements: 10.6, 10.7, 10.9
 */
export async function applyImport(backup: BackupFile): Promise<ImportResult> {
  const counts: Record<string, number> = {};

  for (const table of ENTITY_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceRecords: unknown[] = (backup.entities as Record<string, unknown[]>)[table] ?? [];

    const records = sourceRecords.map((r) => ({
      ...r,
      syncStatus: "pending" as const,
    }));

    try {
      const tbl = db[table as EntityTableName];
      await tbl.bulkPut(records as Parameters<typeof tbl.bulkPut>[0]);
      counts[table] = records.length;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error, failedTable: table };
    }
  }

  return { success: true, counts };
}

/**
 * Generates the download filename for a backup file in the format
 * `passura-backup-YYYY-MM-DD.json` using the current local date.
 */
function buildFilename(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `passura-backup-${yyyy}-${mm}-${dd}.json`;
}

/**
 * Serialises a BackupFile to JSON and triggers a browser file download.
 * Creates a temporary object URL that is immediately revoked after the click.
 */
export function downloadJson(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFilename();
  a.click();
  URL.revokeObjectURL(url);
}
