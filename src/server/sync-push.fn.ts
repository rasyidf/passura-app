import { createServerFn } from "@tanstack/react-start";

/**
 * Server function: Push sync entries to Cloudflare D1.
 * Runs on CF Workers when deployed.
 *
 * TODO: Phase 5 — implement actual D1 write logic.
 */
export const syncPush = createServerFn({ method: "POST" })
  .validator((data: { tenantId: string; entries: unknown[] }) => data)
  .handler(async ({ data }) => {
    // Placeholder — returns success for all entries
    return {
      accepted: data.entries.length,
      rejected: [],
      serverCursor: new Date().toISOString(),
    };
  });
