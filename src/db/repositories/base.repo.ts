import type { Table } from "dexie";
import { db } from "../local-db";
import { generateId } from "@/auth/local-auth";
import type { BaseEntity, SyncStatus } from "../types";

/**
 * Thrown when a Dexie CRUD operation fails (e.g., quota exceeded,
 * schema error, or IndexedDB unavailable).
 */
export class RepositoryError extends Error {
  constructor(
    public readonly operation: "create" | "update" | "remove",
    public readonly entityType: string,
    cause: unknown
  ) {
    super(
      `${operation} failed on '${entityType}': ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
    this.name = "RepositoryError";
    this.cause = cause;
  }
}

/**
 * Generic repository for Dexie CRUD operations.
 * Each entity type extends this for type-safe access.
 */
export class BaseRepository<T extends BaseEntity> {
  constructor(
    protected tableName: string,
    protected table: Table<T, string>
  ) {}

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async getById(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  async create(data: Omit<T, "id" | "syncStatus" | "createdAt" | "updatedAt">): Promise<T> {
    try {
      const now = Date.now();
      const entity = {
        ...data,
        id: generateId(),
        syncStatus: "local" as SyncStatus,
        createdAt: now,
        updatedAt: now,
      } as T;

      await this.table.add(entity);

      // Log the sync entry
      await db.syncLog.add({
        entityType: this.tableName,
        entityId: entity.id,
        action: "create",
        data: entity as unknown as Record<string, unknown>,
        syncStatus: "pending",
        createdAt: now,
      });

      return entity;
    } catch (err) {
      throw new RepositoryError("create", this.tableName, err);
    }
  }

  async update(id: string, data: Partial<Omit<T, "id" | "createdAt">>): Promise<T | undefined> {
    try {
      const now = Date.now();
      const updates = {
        ...data,
        updatedAt: now,
        syncStatus: "pending" as SyncStatus,
      };

      await this.table.update(id, updates as Partial<T>);

      await db.syncLog.add({
        entityType: this.tableName,
        entityId: id,
        action: "update",
        data: updates as unknown as Record<string, unknown>,
        syncStatus: "pending",
        createdAt: now,
      });

      return this.table.get(id);
    } catch (err) {
      throw new RepositoryError("update", this.tableName, err);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const now = Date.now();
      // Soft delete: mark as pending delete in sync log, then remove locally
      await db.syncLog.add({
        entityType: this.tableName,
        entityId: id,
        action: "delete",
        data: { id },
        syncStatus: "pending",
        createdAt: now,
      });
      await this.table.delete(id);
    } catch (err) {
      throw new RepositoryError("remove", this.tableName, err);
    }
  }

  async count(): Promise<number> {
    return this.table.count();
  }

  async query(filter: Partial<T>): Promise<T[]> {
    // Simple filter by first key-value pair
    const entries = Object.entries(filter);
    if (entries.length === 0) return this.getAll();

    const [key, value] = entries[0];
    return this.table.where(key).equals(value as any).toArray();
  }
}
