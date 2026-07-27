-- Migration: add tenant_id to every entity table and sync_log
-- Also adds sync_error column to sync_log for per-entry conflict tracking

-- Add tenant_id to every entity table
ALTER TABLE clans         ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE elders        ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE participants  ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE groups        ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE animal_types  ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE loans         ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE receipts      ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE handovers     ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE obligations   ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE sync_log      ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';

-- Add sync_error column to sync_log for conflict tracking
ALTER TABLE sync_log ADD COLUMN sync_error TEXT;

-- Indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_clans_tenant        ON clans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_elders_tenant       ON elders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_participants_tenant ON participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_groups_tenant       ON groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_animal_types_tenant ON animal_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loans_tenant        ON loans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant     ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_handovers_tenant    ON handovers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_obligations_tenant  ON obligations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant     ON sync_log(tenant_id, updated_at);
