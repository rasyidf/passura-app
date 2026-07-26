# Requirements Document

## Introduction

This feature adds three interconnected capabilities to Passura, a local-first desktop/web app for managing Toraja Rambu Solo' ceremonial records:

1. **Backup** — users can export all local Dexie data as a portable JSON file and restore from it, providing offline-safe disaster recovery.
2. **Sync** — the existing stub sync infrastructure (push/pull routes, Cloudflare D1 adapter, syncLog) is completed into a reliable, conflict-aware bidirectional sync mechanism with auto-sync scheduling and proper error recovery.
3. **Multitenancy** — data is isolated per tenant (organization/ceremony group) so multiple independent tenants can share the same Cloudflare D1 backend without data leakage. This includes a Settings screen where tenant configuration and sync credentials are managed.

## Glossary

- **Tenant**: An independent organization or ceremony group using Passura. Each tenant has its own isolated data namespace.
- **Tenant_ID**: A stable string identifier that scopes all entities and sync operations to a single tenant.
- **Elder**: An authenticated local user stored in Dexie `elders` table. Each Elder belongs to exactly one Tenant.
- **Backup_File**: A JSON file containing a complete snapshot of all local Dexie entities, metadata, and the Tenant_ID.
- **Sync_Log**: The Dexie `syncLog` table that queues create/update/delete operations with `syncStatus: "pending"` until they are pushed to the server.
- **Push**: The operation of sending pending Sync_Log entries from the local device to the Cloudflare D1 backend.
- **Pull**: The operation of fetching server-side changes from the Cloudflare D1 backend and applying them to local Dexie.
- **Cursor**: A Unix timestamp (seconds) stored in `appConfig["sync-cursor"]` marking the last successful Pull. The next Pull fetches only records updated after the Cursor.
- **Conflict**: A situation where the same entity has been modified both locally (pending in Sync_Log) and on the server since the last Pull.
- **Settings_Screen**: A dedicated UI screen at `/dashboard/settings` for managing tenant configuration, sync credentials, backup/restore operations, and data management.
- **Superadmin**: An Elder with `role === "superadmin"` who has full administrative access including tenant setup and Settings management.
- **Validator**: An Elder with `role === "validator"` who can perform sync but cannot change tenant configuration.
- **API_Server**: The Hono backend deployed on Cloudflare Workers at the URL configured in `VITE_API_URL`.
- **D1**: Cloudflare D1 — the SQLite-compatible database used as the shared server-side store.

---

## Requirements

### Requirement 1: Settings Screen

**User Story:** As a Superadmin, I want a dedicated Settings screen, so that I can configure the API connection, manage tenant identity, and access backup and data management tools from one place.

#### Acceptance Criteria

1. THE Settings_Screen SHALL be accessible at the route `/dashboard/settings` within the authenticated dashboard layout.
2. THE Settings_Screen SHALL be reachable via a "Settings" navigation item in the Sidebar that is visible to all authenticated Elders.
3. WHILE an Elder with `role !== "superadmin"` is authenticated, THE Settings_Screen SHALL render all input fields in the sync credentials and backup sections as disabled and hide all save, export, and import controls in those sections.
4. THE Settings_Screen SHALL display the current Tenant_ID, the configured API server URL, and the sync authentication status (authenticated / not authenticated).
5. WHEN a Superadmin saves a changed API URL or Tenant_ID, THE Settings_Screen SHALL write the new value to `appConfig` in Dexie before displaying a success toast notification.
6. IF the API URL field is submitted with a value that does not match the pattern `https?://.+`, THEN THE Settings_Screen SHALL display an inline validation error beneath the field and prevent the save action from executing.
7. IF a Dexie write fails when persisting an API URL or Tenant_ID change, THEN THE Settings_Screen SHALL display an error notification and leave the displayed field value unchanged.

---

### Requirement 2: Tenant Identity and Data Isolation (Local)

**User Story:** As a Superadmin, I want to assign a Tenant_ID to this installation, so that data from this installation is always scoped to our organization and cannot be mixed with another tenant's data.

#### Acceptance Criteria

1. THE App SHALL store the active Tenant_ID in `appConfig["tenant-id"]` in Dexie as the canonical source of truth for the local device's tenant.
2. WHEN the app starts and no Tenant_ID exists in `appConfig["tenant-id"]`, THE App SHALL generate a new UUID v4 string and persist it to `appConfig["tenant-id"]` before rendering any authenticated route.
3. THE Settings_Screen SHALL display the current Tenant_ID from `appConfig["tenant-id"]` in a read-only field visible to all authenticated Elders.
4. THE Settings_Screen SHALL provide an editable Tenant_ID override field that is only enabled for Elders with `role === "superadmin"`.
5. WHEN a Superadmin submits a new Tenant_ID value, THE Settings_Screen SHALL validate that the value is a non-empty string that is not composed entirely of whitespace before writing it to `appConfig["tenant-id"]`.
6. IF a Superadmin submits a Tenant_ID that is empty or contains only whitespace, THEN THE Settings_Screen SHALL display a validation error beneath the field and leave `appConfig["tenant-id"]` unchanged.
7. WHEN a Superadmin successfully saves a new Tenant_ID, THE Settings_Screen SHALL display the updated value in the read-only display field immediately.

---

### Requirement 3: Tenant Isolation on the API Server

**User Story:** As a system operator, I want all entities stored in D1 to be scoped to a Tenant_ID, so that separate tenants cannot read or write each other's data.

#### Acceptance Criteria

1. THE API_Server SHALL require a `tenantId` field in all Push request bodies and validate that it is a non-empty string; IF the field is absent or empty, THEN THE API_Server SHALL return HTTP 400.
2. THE API_Server SHALL store a `tenant_id` column on every entity table in D1 (`clans`, `elders`, `participants`, `groups`, `animal_types`, `loans`, `receipts`, `handovers`, `obligations`, `sync_log`).
3. WHEN the API_Server processes a Push entry, THE API_Server SHALL write the `tenant_id` from the authenticated JWT claim onto every inserted or updated row, ignoring any `tenantId` value supplied in the request body for write scoping.
4. WHEN the API_Server processes a Push delete entry, THE API_Server SHALL scope the delete to rows where `tenant_id` matches the JWT `tenant_id` claim, and SHALL perform no operation if no matching row exists.
5. WHEN the API_Server processes a Pull request, THE API_Server SHALL verify that the `tenantId` query parameter matches the `tenant_id` claim in the authenticated JWT; IF they differ, THEN THE API_Server SHALL return HTTP 403.
6. WHEN the API_Server processes a Pull request and the `tenantId` query parameter matches the JWT claim, THE API_Server SHALL filter all entity queries by that `tenant_id` and return only matching rows.
7. IF a Pull request is received without a `tenantId` query parameter, THEN THE API_Server SHALL return HTTP 400.
8. THE API_Server's JWT payload SHALL include the `tenantId` claim so that the backend can validate that the authenticated Elder belongs to the tenant they are operating on.
9. WHEN an Elder authenticates via `POST /api/auth/login`, THE API_Server SHALL include the Elder's `tenantId` in the returned JWT payload.
10. IF an Elder's record in D1 has no `tenantId` at authentication time, THEN THE API_Server SHALL return HTTP 403 and SHALL NOT issue a JWT.

---

### Requirement 4: Sync — Push

**User Story:** As an Elder, I want local changes to be pushed to the server reliably, so that my data is not lost if my device fails and other team members can see my updates.

#### Acceptance Criteria

1. WHEN the user triggers a manual sync, THE Sync_Engine SHALL collect all Sync_Log entries with `syncStatus: "pending"` and send them to `POST /api/sync/push` in batches of at most 200 entries.
2. THE Sync_Engine SHALL include the active Tenant_ID from `appConfig["tenant-id"]` in every Push request body.
3. WHEN the API_Server returns HTTP 2xx for a pushed entry, THE Sync_Engine SHALL update the corresponding Sync_Log entry's `syncStatus` to `"synced"`.
4. WHEN the API_Server rejects a pushed entry with reason `"conflict"`, THE Sync_Engine SHALL update the corresponding Sync_Log entry's `syncStatus` to `"conflict"` and store the rejection reason in the entry's `syncError` field.
5. WHEN the API_Server rejects a pushed entry with reason `"internal_error"`, THE Sync_Engine SHALL retain the entry as `"pending"` so it will be retried on the next sync.
6. IF a Push request fails due to a network error or HTTP 5xx response, THEN THE Sync_Engine SHALL leave all entries in the batch as `"pending"` and surface an error notification indicating the batch failed and that unsynced changes remain.
7. IF a Push request is attempted while the device is offline (`navigator.onLine === false`), THEN THE Sync_Engine SHALL abort the sync immediately and display a notification indicating sync was not attempted, without modifying any Sync_Log entries.
8. WHEN a Push batch response contains per-entry results, THE Sync_Engine SHALL update each Sync_Log entry individually according to its own result, independent of other entries in the same batch.

---

### Requirement 5: Sync — Pull

**User Story:** As an Elder, I want server changes to be pulled to my local device, so that I always see the latest data entered by other team members.

#### Acceptance Criteria

1. WHEN the Sync_Engine executes a Pull, THE Sync_Engine SHALL send a `GET /api/sync/pull` request with `since` equal to the value stored in `appConfig["sync-cursor"]`, or `0` if no cursor exists.
2. THE Sync_Engine SHALL include the active Tenant_ID as the `tenantId` query parameter in every Pull request.
3. WHEN the API_Server returns entity rows in a Pull response, THE Sync_Engine SHALL upsert each row into the corresponding local Dexie table using `table.put()` only if the local record's `syncStatus` is not `"pending"`, to avoid overwriting unsynced local changes.
4. WHEN a Pull response is received successfully, THE Sync_Engine SHALL update `appConfig["sync-cursor"]` to the `serverCursor` value from the response.
5. WHEN a Pull response contains `hasMore: true` for any entity type, THE Sync_Engine SHALL perform additional Pull requests using the `serverCursor` from the previous response as the `since` value, continuing until `hasMore` is `false` for all entity types.
6. WHEN the Sync_Engine completes both Push and Pull phases without error, THE Sync_Engine SHALL invalidate all React Query caches so the UI reflects the latest data.
7. IF a Pull request fails due to a network error, HTTP 5xx, or HTTP 4xx response, THEN THE Sync_Engine SHALL retain the existing cursor value unchanged and surface an error notification to the user.

---

### Requirement 6: Sync — Authentication and Configuration

**User Story:** As an Elder, I want to authenticate against the API server from within the app, so that sync works without manually managing tokens.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide an "Authenticate" form with `email` and `password` fields that submits credentials to `POST /api/auth/login`.
2. WHEN authentication succeeds, THE Sync_Engine SHALL store the returned JWT in `appConfig["sync-token"]` and update the displayed authentication status to "Authenticated".
3. WHEN authentication fails and the API_Server returns a parseable error response, THE Settings_Screen SHALL display the error message from the response body and leave the existing token in `appConfig["sync-token"]` unchanged.
4. WHEN the user activates "Sign Out from Server", THE Settings_Screen SHALL delete `appConfig["sync-token"]` from Dexie and set the displayed authentication status to "Not authenticated".
5. WHEN the Sync_Engine attempts a Push or Pull and receives HTTP 401 from the API_Server, THE Sync_Engine SHALL delete `appConfig["sync-token"]`, update the SyncStatusBar to an unauthenticated error state, and surface the Settings_Screen authentication form with a message prompting the user to re-authenticate.
6. WHEN a valid, non-expired JWT is stored in `appConfig["sync-token"]`, THE Settings_Screen SHALL display the token's expiry date (decoded from the `exp` claim) and show the status as "Authenticated", without making a network request.
7. IF authentication fails due to a network error or an unparseable response, THEN THE Settings_Screen SHALL display a generic network error message and leave the existing token unchanged.
8. IF `appConfig["sync-token"]` is absent, has an `exp` claim in the past, or cannot be decoded as a JWT, THEN THE Settings_Screen SHALL display the authentication status as "Not authenticated".

---

### Requirement 7: Sync — Auto-Sync Scheduling

**User Story:** As an Elder, I want the app to sync automatically at regular intervals while I am online, so that I do not have to remember to sync manually.

#### Acceptance Criteria

1. WHILE the app is open and the device is online and the Elder is authenticated to the API_Server and auto-sync is enabled, THE Sync_Engine SHALL automatically trigger a sync every 5 minutes.
2. WHEN an auto-sync is in progress, THE SyncStatusBar SHALL display a loading indicator identical to the one shown during a manual sync.
3. IF an auto-sync fails, THE Sync_Engine SHALL display an error notification to the user.
4. IF an auto-sync fails, THE Sync_Engine SHALL remain operational and schedule the next auto-sync attempt 5 minutes after the failure time.
5. WHEN a Superadmin disables auto-sync in the Settings_Screen, THE Sync_Engine SHALL stop scheduling automatic sync intervals.
6. WHEN a Superadmin disables auto-sync in the Settings_Screen, THE Settings_Screen SHALL persist the preference to `appConfig["auto-sync-enabled"]` as `false`.
7. WHILE auto-sync is disabled, THE SyncStatusBar SHALL display an "Auto-sync off" indicator.
8. WHEN a Superadmin re-enables auto-sync in the Settings_Screen, THE Sync_Engine SHALL schedule the next auto-sync to trigger 5 minutes after the re-enable action, not immediately.

---

### Requirement 8: Sync — Conflict Visibility

**User Story:** As a Superadmin, I want to see and resolve sync conflicts, so that data integrity is maintained when the same record is modified on multiple devices.

#### Acceptance Criteria

1. IF the count of Sync_Log entries with `syncStatus: "conflict"` is greater than zero, THEN THE SyncStatusBar SHALL display that count.
2. THE Settings_Screen SHALL include a "Conflicts" section that lists all Sync_Log entries with `syncStatus: "conflict"`, showing entity type, entity ID, action, and the `syncError` field value recorded at conflict time.
3. WHEN a Superadmin selects "Discard Local" on a conflict entry and the `GET /api/:entity/:id` request succeeds, THE Settings_Screen SHALL delete the corresponding Sync_Log entry and replace the local Dexie record with the server-returned data.
4. WHEN a Superadmin selects "Keep Local" on a conflict entry, THE Settings_Screen SHALL update the Sync_Log entry's `syncStatus` to `"pending"` so it will be retried on the next sync, overwriting the server version.
5. IF the conflict list is empty, THE Settings_Screen SHALL display a "No conflicts" message in the Conflicts section.
6. IF the `GET /api/:entity/:id` request fails (network error, HTTP 4xx, or HTTP 5xx) when a Superadmin selects "Discard Local", THEN THE Settings_Screen SHALL display an error notification and leave the Sync_Log entry and local Dexie record unchanged.

---

### Requirement 9: Backup — Export

**User Story:** As a Superadmin, I want to export all local data to a file, so that I can keep an offline backup and transfer data between devices.

#### Acceptance Criteria

1. IF the authenticated Elder has `role === "superadmin"`, THEN THE Settings_Screen SHALL display an "Export Backup" button; otherwise the button SHALL be hidden.
2. WHEN the "Export Backup" button is activated, THE Backup_Engine SHALL read only the records belonging to the current session's Tenant_ID from all Dexie entity tables (`clans`, `elders`, `participants`, `groups`, `animalTypes`, `loans`, `receipts`, `handovers`, `obligations`) and write them to a Backup_File.
3. THE Backup_File SHALL be a valid JSON object conforming to the structure: `{ "version": 1, "tenantId": "<string>", "exportedAt": "<ISO-8601 datetime>", "entities": { "<tableName>": [...] } }`.
4. THE Backup_Engine SHALL initiate a browser file download of the Backup_File with the filename pattern `passura-backup-<YYYY-MM-DD>.json`.
5. THE Backup_Engine SHALL NOT include the `syncLog` or `appConfig` tables in the Backup_File to avoid restoring stale sync state onto a different device.
6. WHEN the export operation completes successfully, THE Settings_Screen SHALL display a success notification with the number of records exported per entity type.
7. IF any Dexie read operation fails during export, THEN THE Backup_Engine SHALL abort the export, display an error notification, and NOT initiate a file download.

---

### Requirement 10: Backup — Import/Restore

**User Story:** As a Superadmin, I want to import a backup file, so that I can restore data on a new device or recover from data loss.

#### Acceptance Criteria

1. IF the authenticated Elder has `role === "superadmin"`, THEN THE Settings_Screen SHALL display an "Import Backup" file input that accepts `.json` files; otherwise the control SHALL be hidden.
2. IF the selected file cannot be parsed as JSON, THEN THE Backup_Engine SHALL display an error message stating the file is not valid JSON and perform no writes to Dexie.
3. IF the parsed JSON is missing the `version` field, has `version !== 1`, or is missing the `entities` object, THEN THE Backup_Engine SHALL display an error identifying the specific validation failure and perform no writes to Dexie.
4. IF the `tenantId` in the parsed Backup_File differs from the value in `appConfig["tenant-id"]` (or `appConfig["tenant-id"]` does not exist), THEN THE Settings_Screen SHALL display a warning that the backup originated from a different tenant before showing the confirmation dialog.
5. WHEN a valid Backup_File passes all validation checks, THE Settings_Screen SHALL display a confirmation dialog showing the `tenantId`, `exportedAt` date, and record counts per entity before any data is written.
6. WHEN the user confirms the import, THE Backup_Engine SHALL upsert all entity records from the `entities` object into the 9 entity Dexie tables (`clans`, `elders`, `participants`, `groups`, `animalTypes`, `loans`, `receipts`, `handovers`, `obligations`) using `table.bulkPut()`, preserving the original `id`, `createdAt`, and `updatedAt` values. THE Backup_Engine SHALL NOT write to `syncLog` or `appConfig`.
7. WHEN the user confirms the import, THE Backup_Engine SHALL set `syncStatus: "pending"` on all imported records so that the next sync pushes them to the server.
8. WHEN the import operation completes, THE Backup_Engine SHALL invalidate all React Query caches and display a success notification with the count of records imported per entity type.
9. IF a `bulkPut` operation fails for any table, THEN THE Backup_Engine SHALL display an error notification identifying the failing table and leave the successfully imported tables intact.
10. IF the selected file exceeds 50 MB, THEN THE Backup_Engine SHALL display an error message indicating the file is too large and perform no further processing.

---

### Requirement 11: Backup — Round-Trip Integrity

**User Story:** As a Superadmin, I want to be confident that exported and re-imported data is identical, so that backups are trustworthy.

#### Acceptance Criteria

1. FOR ALL valid Dexie database states, exporting a Backup_File and then importing it SHALL produce a local database containing every record that was present at export time with identical field values (round-trip property).
2. THE Backup_Engine SHALL serialize all numeric timestamps as integers (not floats or strings) in the Backup_File.
3. THE Backup_Engine SHALL serialize all JSON array fields (`witnesses`, `members`, `repayments`) as native JSON arrays (not double-encoded strings) in the Backup_File.
4. THE Backup_File Parser SHALL return a descriptive error for any Backup_File whose top-level `version` value is not the integer `1`.

---

### Requirement 12: Data Management — Reset

**User Story:** As a Superadmin, I want to reset all local data, so that I can start fresh or hand the device to a different tenant without residual data.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "Reset All Local Data" action accessible only to Superadmin users.
2. WHEN the "Reset All Local Data" action is activated, THE Settings_Screen SHALL display a confirmation dialog requiring the user to type the word `"RESET"` before the action is enabled.
3. WHEN the user confirms the reset by typing `"RESET"` and submitting, THE Data_Manager SHALL clear all records from all Dexie tables including `syncLog` and `appConfig`.
4. WHEN the local reset completes, THE App SHALL navigate the user to the `/login` route and display a notification that all local data has been cleared.
5. IF any Dexie clear operation fails, THEN THE Data_Manager SHALL display an error notification and leave the remaining tables intact.
