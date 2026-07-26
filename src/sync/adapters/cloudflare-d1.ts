import type { SyncAdapter, SyncEntry, SyncCursors, PushResult, PullResult, AuthCredentials, AuthResult } from "../sync-adapter";
import { db } from "@/db/local-db";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export class CloudflareD1Adapter implements SyncAdapter {
  private token: string | null = null;

  constructor() {
    // Load persisted token from IndexedDB on construction
    db.appConfig.get("sync-token").then((cfg) => {
      this.token = (cfg?.value as string) ?? null;
    });
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }));
      return { success: false, error: (err as any).error ?? "Login failed" };
    }

    const data = await res.json() as { token: string };
    this.token = data.token;
    await db.appConfig.put({ key: "sync-token", value: data.token });
    return { success: true, token: data.token };
  }

  async push(tenantId: string, entries: SyncEntry[]): Promise<PushResult> {
    if (!this.token) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/api/sync/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ tenantId, entries }),
    });

    if (!res.ok) throw new Error(`Push failed: ${res.status}`);
    return res.json();
  }

  async pull(tenantId: string, cursors: SyncCursors): Promise<PullResult> {
    if (!this.token) throw new Error("Not authenticated");

    const since = cursors["_global"] ?? "0";
    const url = `${API_BASE}/api/sync/pull?since=${since}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    const data = await res.json() as {
      entities: Record<string, { data: unknown[]; hasMore: boolean }>;
      serverCursor: string;
    };

    return {
      entities: Object.entries(data.entities).map(([type, val]) => ({
        type,
        data: val.data as Record<string, unknown>[],
      })),
      cursors: { _global: data.serverCursor },
      hasMore: Object.values(data.entities).some((v) => v.hasMore),
    };
  }

  isAvailable(): boolean {
    return navigator.onLine && !!this.token;
  }
}
