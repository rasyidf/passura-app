import type {
  SyncAdapter,
  SyncEntry,
  SyncCursors,
  PushResult,
  PullResult,
  AuthCredentials,
  AuthResult,
} from "../sync-adapter";

/**
 * No-op sync adapter — used when app is in pure offline mode.
 * All operations succeed silently without actually syncing anywhere.
 */
export class NoopAdapter implements SyncAdapter {
  async push(_tenantId: string, entries: SyncEntry[]): Promise<PushResult> {
    return {
      accepted: entries.length,
      rejected: [],
      serverCursor: "",
    };
  }

  async pull(_tenantId: string, _cursors: SyncCursors): Promise<PullResult> {
    return {
      entities: [],
      cursors: {},
      hasMore: false,
    };
  }

  async authenticate(_credentials: AuthCredentials): Promise<AuthResult> {
    return { success: true };
  }

  isAvailable(): boolean {
    return false; // Noop adapter is never "available" for real sync
  }
}
