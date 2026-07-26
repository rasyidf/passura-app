import { createServerFn } from "@tanstack/react-start";

/**
 * Server function: Pull changes from Cloudflare D1.
 * Runs on CF Workers when deployed.
 *
 * TODO: Phase 5 — implement actual D1 read logic.
 */
export const syncPull = createServerFn({ method: "POST" })
  .validator((data: { tenantId: string; cursors: Record<string, string> }) => data)
  .handler(async () => {
    // Placeholder — no new data to pull
    return {
      entities: [],
      cursors: {},
      hasMore: false,
    };
  });
