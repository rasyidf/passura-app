/**
 * Sync adapter interface — pluggable backend for push/pull synchronization.
 * Default: NoopAdapter (pure offline, no sync).
 */

export interface SyncEntry {
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
}

export interface PushResultEntry {
  id: string;
  status: "synced" | "conflict" | "internal_error";
  reason?: string;
}

export interface PushResult {
  results: PushResultEntry[];
  serverCursor: string;
}

export interface PullResult {
  entities: { type: string; data: Record<string, unknown>[] }[];
  cursors: SyncCursors;
  hasMore: boolean;
}

export type SyncCursors = Record<string, string>; // entityType → cursor

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface SyncAdapter {
  /** Push local changes to server */
  push(tenantId: string, entries: SyncEntry[]): Promise<PushResult>;

  /** Pull server changes since cursor */
  pull(tenantId: string, cursors: SyncCursors): Promise<PullResult>;

  /** Authenticate this device with the server */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;

  /** Check if sync is available (has config + online) */
  isAvailable(): boolean;
}
