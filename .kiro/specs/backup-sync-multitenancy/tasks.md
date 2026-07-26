# Implementation Plan: Backup, Sync & Multitenancy

## Overview

This plan implements three interconnected capabilities for Passura:

1. **Backup** — `exportBackup()` / `importBackup()` / `applyImport()` pure-function engine plus the Backup tab UI.
2. **Sync** — completed push/pull engine with per-entry result handling, conflict guard, 401 handling, auto-sync scheduler, and Conflicts tab UI.
3. **Multitenancy** — `tenant_id` column migration on D1, JWT `tenantId` claim, tenant-scoped push/pull, and the unified Settings screen.

The implementation is TypeScript throughout (matching the existing codebase).

---

## Tasks

- [ ] 1. Data layer foundations — types, Dexie migration, D1 migration
  - [ ] 1.1 Extend `SyncLogEntry` type and bump Dexie to version 5
    - Add `syncError?: string` field to `SyncLogEntry` in `src/db/types.ts`
    - Add `tenantId` JSDoc note to `AppConfig` explaining the `tenant-id` key
    - Bump `PassuraDb` to version 5 in `src/db/local-db.ts` with stores entry: `syncLog: "++id, entityType, entityId, action, syncStatus, [syncStatus+createdAt], syncError"`
    - _Requirements: 4.4, 8.2_

  - [ ] 1.2 Add `tenantId` column to Drizzle D1 schema and create migration file
    - Add `tenantId: text("tenant_id").notNull().default("")` to all 9 entity tables + `syncLog` in `api/src/db/schema.ts`
    - Add `syncError: text("sync_error")` to `syncLog` in schema
    - Create `drizzle/0001_add_tenant_id.sql` with `ALTER TABLE` statements for all 10 tables, `sync_error` column on `sync_log`, and `CREATE INDEX` statements per the design
    - _Requirements: 3.2_

  - [ ] 1.3 Add `tenantId` to JWT payload interface and update `signJwt` signature
    - Add `tenantId: string` to the `JwtPayload` interface in `api/src/lib/auth.ts`
    - Update `signJwt` parameter type from `Omit<JwtPayload, "iat" | "exp">` to include `tenantId`
    - _Requirements: 3.8_

- [ ] 2. Backup engine — pure functions
  - [ ] 2.1 Create `src/backup/backup-types.ts`
    - Define and export `BackupFile`, `ExportResult`, `ImportResult` interfaces exactly as specified in the design
    - _Requirements: 9.3_

  - [ ] 2.2 Create `src/backup/backup-engine.ts` — `exportBackup`
    - Implement `exportBackup(tenantId: string): Promise<ExportResult>` reading all 9 entity tables via `db[table].toArray()`
    - Build `BackupFile` with `version: 1`, `tenantId`, ISO-8601 `exportedAt`, and `entities` object
    - Ensure timestamps are integers via `Math.trunc`
    - Implement `buildFilename()` and `downloadJson()` helpers
    - Throw on any Dexie read error (caller handles toast)
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.7_

  - [ ]* 2.3 Write property test for `exportBackup` — Property 25 and 26
    - Create `src/backup/__tests__/backup-engine.properties.test.ts`
    - **Property 25: Exported backup excludes syncLog and appConfig**
    - **Property 26: Exported backup structure is well-formed**
    - **Validates: Requirements 9.3, 9.5**

  - [ ] 2.4 Implement `importBackup` validation phase in `backup-engine.ts`
    - Implement `importBackup(file: File, localTenantId: string): Promise<{ backup: BackupFile; tenantMismatch: boolean }>`
    - Sequential validation: file size ≤ 50 MB → JSON parse → `version === 1` check → `entities` object check
    - Return `{ backup, tenantMismatch: backup.tenantId !== localTenantId }`
    - Throw descriptive errors at each validation step — zero Dexie writes in this function
    - _Requirements: 10.2, 10.3, 10.4, 10.10_

  - [ ]* 2.5 Write property test for `importBackup` validation — Property 28
    - **Property 28: Import rejects invalid JSON and bad structure**
    - **Validates: Requirements 10.2, 10.3, 11.4**

  - [ ] 2.6 Implement `applyImport` write phase in `backup-engine.ts`
    - Implement `applyImport(backup: BackupFile): Promise<ImportResult>`
    - Loop over `ENTITY_TABLES`; for each table call `db[table].bulkPut(records.map(r => ({ ...r, syncStatus: "pending" })))`
    - Preserve original `id`, `createdAt`, `updatedAt`
    - On `bulkPut` failure for any table: return `{ success: false, error, failedTable }` — leave successfully written tables intact
    - Return `{ success: true, counts }` on complete success
    - _Requirements: 10.6, 10.7, 10.9_

  - [ ]* 2.7 Write property tests for `applyImport` — Properties 30 and 31
    - Create shared arbitraries in `src/backup/__tests__/arbitraries.ts` (export `arbEntity`, `arbBackupFile`, `arbDbState`)
    - **Property 30: All imported records have syncStatus set to pending**
    - **Property 31: Backup round-trip preserves record fidelity**
    - **Validates: Requirements 10.7, 11.1, 11.2, 11.3**

- [ ] 3. Checkpoint — backup engine unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. API server — multitenancy
  - [ ] 4.1 Update `POST /api/auth/login` to include `tenantId` in JWT
    - Read `elder.tenantId` after password verification
    - If `elder.tenantId` is null or empty string, return `403` without issuing a JWT
    - Pass `tenantId` to `signJwt({ elderId, email, role, tenantId })`
    - _Requirements: 3.9, 3.10_

  - [ ]* 4.2 Write unit tests for auth route — Property 5
    - **Property 5: JWT tenant claim matches elder's stored tenantId**
    - Also cover: elder with null tenantId → 403; elder with non-empty tenantId → JWT contains matching claim
    - **Validates: Requirements 3.8, 3.9, 3.10**

  - [ ] 4.3 Update `POST /api/sync/push` for tenant validation and scoped writes
    - Validate `body.tenantId` is a non-empty string; return 400 if absent or empty
    - On `create`/`update`: set `tenant_id` = `auth.tenantId` (JWT claim) on every row — ignore `body.tenantId` for the DB write
    - On `delete`: scope delete to `WHERE id = ? AND tenant_id = auth.tenantId`; no-op if no matching row
    - Per-entry response: `{ id, status: "synced" | "conflict" | "internal_error", reason? }`
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 4.4 Write property tests for push tenant isolation — Properties 6 and 7
    - Create `api/src/__tests__/api-tenant-isolation.properties.test.ts`
    - **Property 6: Server writes JWT tenant_id onto every pushed row**
    - **Property 7: Cross-tenant delete isolation**
    - **Validates: Requirements 3.3, 3.4**

  - [ ] 4.5 Update `GET /api/sync/pull` for tenant validation and scoped queries
    - Validate `tenantId` query parameter present; return 400 if absent
    - Validate `tenantId` param === `auth.tenantId` JWT claim; return 403 if they differ
    - Filter all entity queries with `WHERE tenant_id = auth.tenantId AND updated_at > since`
    - Add pagination: `LIMIT 500`, `hasMore = rows.length >= 500`
    - Update `denormalizeRow` to strip `tenant_id` from outbound rows (clients don't need it)
    - _Requirements: 3.5, 3.6, 3.7, 5.5_

  - [ ]* 4.6 Write property test for pull tenant isolation — Property 8
    - **Property 8: Pull filters to requesting tenant only**
    - **Validates: Requirements 3.5, 3.6**

- [ ] 5. Checkpoint — API multitenancy tests pass
  - Ensure all API unit tests and property tests pass, ask the user if questions arise.

- [ ] 6. Sync engine — `useSync` hook and `CloudflareD1Adapter`
  - [ ] 6.1 Update `CloudflareD1Adapter` for tenantId, 401 handling, and runtime API base
    - Add async `getApiBase()` helper that reads `appConfig["api-url"]` first, falls back to `VITE_API_URL`
    - Update `pull()` to pass `tenantId` as query param and read API base at call time
    - Throw `AuthError` (a custom error class with `code: "401"`) when API returns 401 on push or pull
    - _Requirements: 3.7, 6.5_

  - [ ] 6.2 Rewrite `useSync` push phase — batching, per-entry results, 401 handling
    - Read `tenantId` from `appConfig["tenant-id"]`
    - Batch pending entries into groups of ≤ 200 and push each batch
    - On `accepted` entry: `syncLog.update(id, { syncStatus: "synced" })`
    - On `conflict` entry: `syncLog.update(id, { syncStatus: "conflict", syncError: reason })`
    - On `internal_error` entry: leave as `"pending"`
    - On `AuthError` (401): delete `appConfig["sync-token"]`, set state to error, show re-auth toast
    - On network error / 5xx: leave all batch entries as `"pending"`, toast error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 6.5_

  - [ ]* 6.3 Write property tests for push behavior — Properties 9, 10, 11, 12, 13, 14
    - Create `src/sync/__tests__/sync-engine.properties.test.ts` and `arbitraries.ts`
    - **Property 9: Push batches do not exceed 200 entries per call**
    - **Property 10: Push request always carries local tenantId**
    - **Property 11: Accepted push entries are marked synced**
    - **Property 12: Conflict-rejected push entries are recorded with error**
    - **Property 13: Network failure leaves all push entries pending**
    - **Property 14: Offline sync makes no Dexie modifications**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 4.7**

  - [ ] 6.4 Rewrite `useSync` pull phase — conflict guard, cursor, pagination
    - Read cursor from `appConfig["sync-cursor"]` (default `"0"`)
    - On each pulled row: check local `syncStatus`; skip `table.put()` if local is `"pending"` (conflict guard)
    - Update `appConfig["sync-cursor"]` to `serverCursor` after each page
    - Loop while `hasMore === true` until exhausted
    - On `AuthError` (401): delete token, prompt re-auth
    - On any other error: preserve cursor unchanged, toast error
    - After success: `qc.invalidateQueries()`, `setState("success")`, `setLastSyncAt(new Date())`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.5_

  - [ ]* 6.5 Write property tests for pull behavior — Properties 15, 16, 17, 20
    - **Property 15: Conflict guard — pending local record is not overwritten**
    - **Property 16: Successful pull updates the sync cursor**
    - **Property 17: Pull failure preserves existing cursor**
    - **Property 20: 401 response deletes the stored sync token**
    - **Validates: Requirements 5.3, 5.4, 5.7, 6.5**

- [ ] 7. Auto-sync scheduler hook
  - [ ] 7.1 Create `src/hooks/useSyncScheduler.ts`
    - Implement `useSyncScheduler(sync: () => Promise<void>): void`
    - Read `auto-sync-enabled` and `sync-token` from `appConfig` reactively (re-run effect when they change)
    - Schedule `setInterval(sync, 5 * 60 * 1000)` only when: `navigator.onLine && tokenPresent && autoSyncEnabled`
    - First fire is 5 minutes after mount or after re-enable — never immediately on enable
    - Clear interval on unmount via `useEffect` cleanup
    - _Requirements: 7.1, 7.4, 7.5, 7.8_

  - [ ] 7.2 Mount `useSyncScheduler` in dashboard route layout
    - Import and call `useSyncScheduler(sync)` inside the `DashboardLayout` component in `src/routes/dashboard/route.tsx`
    - Also add `SyncStatusBar` to the layout footer here if not yet present
    - _Requirements: 7.1_

- [ ] 8. Tenant ID initialisation in app startup
  - [ ] 8.1 Add UUID v4 auto-generation to `OnboardingGuard` or dashboard layout
    - On mount: check `appConfig["tenant-id"]`; if absent, generate a UUID v4 (use `crypto.randomUUID()`) and persist it
    - Must run before any authenticated route renders
    - _Requirements: 2.1, 2.2_

- [ ] 9. Settings screen — routes and layout
  - [ ] 9.1 Create the `/dashboard/settings` TanStack Router file-based route
    - Create `src/routes/dashboard/settings.tsx` with `createFileRoute("/dashboard/settings")` exporting the route and rendering `<SettingsScreen />`
    - Create redirect stubs for old routes: `src/routes/dashboard/profile.tsx`, `src/routes/dashboard/backup.tsx`, `src/routes/dashboard/sync.tsx` — each redirects to `/dashboard/settings`
    - _Requirements: 1.1_

  - [ ] 9.2 Update Sidebar navigation to replace the three Konfigurasi items with a single "Pengaturan" item
    - Replace the three items (`/dashboard/profile`, `/dashboard/backup`, `/dashboard/sync`) in `navGroups` with one item: `{ href: "/dashboard/settings", label: "Pengaturan", icon: <Settings /> }`
    - _Requirements: 1.2, 2.3_

  - [ ] 9.3 Create `src/components/screen/settings/SettingsScreen.tsx` — top-level shell with five tabs
    - Use shadcn/ui `Tabs` with tab keys: `tenant`, `sync`, `backup`, `conflicts`, `danger`
    - Read `useAuth()` for the authenticated elder; pass `isSuperadmin` flag down to child tab components
    - Render: `<TenantTab>`, `<SyncTab>`, `<BackupTab>`, `<ConflictsTab>`, `<DangerZoneTab>`
    - _Requirements: 1.1, 1.3, 1.4_

- [ ] 10. Tenant tab and Sync tab
  - [ ] 10.1 Create `src/components/screen/settings/TenantTab.tsx`
    - Display current `appConfig["tenant-id"]` in a read-only field (all roles)
    - Display current `appConfig["api-url"]` (or `VITE_API_URL` fallback)
    - For superadmin: editable Tenant ID override with save button; validate non-empty after `.trim()` (show inline error if blank); write to `appConfig["tenant-id"]` on confirm
    - For superadmin: editable API URL field with save button; validate against `/^https?:\/\/.+/` (show inline error if invalid); write to `appConfig["api-url"]` on confirm
    - Show success/error toast on Dexie write outcome
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 10.2 Write property tests for tenant/API URL validation — Properties 3 and 4
    - **Property 3: Valid API URL is accepted; invalid URL is rejected**
    - **Property 4: Tenant ID validation — whitespace strings are rejected**
    - **Validates: Requirements 1.5, 1.6, 2.5, 2.6**

  - [ ] 10.3 Create `src/components/screen/settings/SyncTab.tsx`
    - Display sync authentication status: decode `appConfig["sync-token"]`; if valid non-expired JWT → show "Authenticated" + expiry date; otherwise → "Not authenticated"
    - For superadmin: email + password form that calls `adapter.authenticate()` → on success store token and update status; on failure show API error message; on network error show generic message
    - For superadmin: "Sign Out from Server" button that deletes `appConfig["sync-token"]`
    - For superadmin: auto-sync toggle that reads/writes `appConfig["auto-sync-enabled"]`
    - "Sinkronisasi Sekarang" button (all roles) that calls `sync()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 7.5, 7.6_

  - [ ]* 10.4 Write property tests for JWT status display — Properties 18 and 19
    - **Property 18: Authentication outcome correctly updates stored token**
    - **Property 19: JWT status display reflects token validity**
    - **Validates: Requirements 6.2, 6.3, 6.6, 6.8**

- [ ] 11. Backup tab
  - [ ] 11.1 Create `src/components/screen/settings/BackupTab.tsx`
    - For superadmin: "Export Backup" button; on click call `exportBackup(tenantId)` then `downloadJson(backup)`; on success show toast with per-table counts; on error show error toast without triggering download
    - For superadmin: "Import Backup" file input (`.json` only); on file select call `importBackup(file, localTenantId)`:
      - On validation error: show error message, no further action
      - If `tenantMismatch`: show warning dialog before showing confirmation
      - Show confirmation dialog with `tenantId`, `exportedAt`, and record counts
      - On user confirm: call `applyImport(backup)` → on success toast with counts + `qc.invalidateQueries()`; on error toast identifying failing table
    - Hide both controls entirely for non-superadmin
    - _Requirements: 9.1, 9.2, 9.4, 9.6, 9.7, 10.1, 10.4, 10.5, 10.6, 10.8, 10.9_

- [ ] 12. Conflicts tab and SyncStatusBar updates
  - [ ] 12.1 Create `src/components/screen/settings/ConflictsTab.tsx`
    - Query `db.syncLog.where("syncStatus").equals("conflict").toArray()` reactively
    - Render a table with columns: entity type, entity ID, action, `syncError`
    - "Discard Local" button per row: call `GET /api/:entityType/:entityId` (using the existing `entityRoutes`); on success delete syncLog entry and `db[table].put(serverRecord)`; on failure show error toast, leave entry and record unchanged
    - "Keep Local" button per row: update syncLog entry `syncStatus` to `"pending"`
    - Empty state: "Tidak ada konflik"
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 12.2 Write property tests for conflict UI behavior — Properties 21, 22, 23, 24
    - **Property 21: Conflict count in SyncStatusBar matches actual conflict entries**
    - **Property 22: Conflict list renders all required fields for every entry**
    - **Property 23: "Keep Local" sets conflict entry back to pending**
    - **Property 24: "Discard Local" failure leaves entry and local record unchanged**
    - **Validates: Requirements 8.1, 8.2, 8.4, 8.6**

  - [ ] 12.3 Update `SyncStatusBar` — conflict count badge and auto-sync indicator
    - Add `conflictCount` by querying `syncLog WHERE syncStatus='conflict'` (alongside existing `pendingCount`)
    - Display conflict count badge (red, with `AlertTriangle`) when `conflictCount > 0`
    - Read `appConfig["auto-sync-enabled"]` and display "Auto-sync off" label when `false`
    - _Requirements: 7.7, 8.1_

- [ ] 13. Danger Zone tab
  - [ ] 13.1 Create `src/components/screen/settings/DangerZoneTab.tsx`
    - For superadmin: red "Reset Semua Data Lokal" button that opens a confirmation dialog
    - Dialog requires the user to type `"RESET"` into an input field before the confirm button is enabled
    - On confirm: clear all Dexie tables in order (entity tables + `syncLog` + `appConfig`); if any `.clear()` fails show error toast and leave remaining tables intact
    - On complete reset: navigate to `/login` and show notification
    - Hide control entirely for non-superadmin
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 13.2 Write property test for data reset — Property 32
    - **Property 32: Data reset clears all Dexie tables**
    - **Validates: Requirements 12.3**

- [ ] 14. Role-gating cross-cut — Settings controls hidden for non-superadmin
  - [ ]* 14.1 Write property tests for role-gating — Properties 1 and 2
    - **Property 1: Settings controls are gated by superadmin role**
    - **Property 2: Sidebar navigation link is visible for all roles**
    - **Validates: Requirements 1.2, 1.3, 9.1, 10.1, 12.1**

- [ ] 15. Final checkpoint — all tests pass, wiring complete
  - Ensure all unit tests and property tests pass.
  - Verify the full sync round-trip: export, Sidebar navigation, Settings tabs, conflict resolution.
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- The design already has a `Correctness Properties` section, so property test sub-tasks are included throughout.
- The existing `useSync.ts` and `cloudflare-d1.ts` files are extended rather than replaced to preserve any working logic.
- Dexie is bumped to version 5 (not 4) because the codebase already uses version 4 for the participant schema migration.
- The D1 migration file must be run against the Cloudflare D1 database separately — this task list only covers writing the migration file.
- Shared arbitraries for property tests are split between `src/backup/__tests__/arbitraries.ts` and `src/sync/__tests__/arbitraries.ts` to keep test files focused.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "4.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "4.2", "4.3", "8.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.4", "4.5", "6.2"] },
    { "id": 4, "tasks": ["2.5", "4.6", "6.3", "6.4"] },
    { "id": 5, "tasks": ["2.6", "6.5"] },
    { "id": 6, "tasks": ["2.7", "7.1"] },
    { "id": 7, "tasks": ["7.2", "9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3"] },
    { "id": 9, "tasks": ["10.1", "10.3", "11.1", "12.1", "13.1"] },
    { "id": 10, "tasks": ["10.2", "10.4", "12.2", "12.3", "13.2", "14.1"] }
  ]
}
```
