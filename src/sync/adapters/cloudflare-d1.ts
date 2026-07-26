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
 * Cloudflare D1 sync adapter.
 * Uses TanStack Start server functions to push/pull data to/from D1.
 * Implemented as server functions in src/server/ when deployed to CF Workers.
 *
 * TODO: Implement when Phase 5 (Sync Layer) is reached.
 */
export class CloudflareD1Adapter implements SyncAdapter {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async push(tenantId: string, entries: SyncEntry[]): Promise<PushResult> {
    const res = await fetch(`${this.baseUrl}/_serverFn/sync/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ tenantId, entries }),
    });
    if (!res.ok) throw new Error(`Push failed: ${res.status}`);
    return res.json();
  }

  async pull(tenantId: string, cursors: SyncCursors): Promise<PullResult> {
    const res = await fetch(`${this.baseUrl}/_serverFn/sync/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ tenantId, cursors }),
    });
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    return res.json();
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    const res = await fetch(`${this.baseUrl}/_serverFn/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) return { success: false, error: "Auth failed" };
    const data = await res.json();
    this.token = data.token;
    return { success: true, token: data.token };
  }

  isAvailable(): boolean {
    return navigator.onLine && !!this.token;
  }
}
