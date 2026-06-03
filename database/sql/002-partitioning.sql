-- ============================================================================
-- BharatScore / CredSaathi — Partitioning Strategy
-- Requires: pg_partman extension enabled
-- ============================================================================

-- NOTE: If pg_partman is not available (e.g., on RDS without extension),
-- create partitions manually using the templates below.

-- ── EMI SCHEDULES — Monthly partitions by due_date ───────────────────────
-- To use native partitioning, the table must be created with PARTITION BY:
-- ALTER TABLE emi_schedules ... is not possible for adding partitioning.
-- Instead, use pg_partman if available:

-- SELECT partman.create_parent(
--   p_parent_table := 'public.emi_schedules',
--   p_control := 'due_date',
--   p_type := 'range',
--   p_interval := 'monthly',
--   p_premake := 3
-- );

-- ── REPAYMENT EVENTS — Monthly partitions by paid_at ─────────────────────
-- SELECT partman.create_parent(
--   p_parent_table := 'public.repayment_events',
--   p_control := 'paid_at',
--   p_type := 'range',
--   p_interval := 'monthly',
--   p_premake := 3
-- );

-- ── AUDIT LOGS — Monthly partitions by logged_at ─────────────────────────
-- SELECT partman.create_parent(
--   p_parent_table := 'public.audit_logs',
--   p_control := 'logged_at',
--   p_type := 'range',
--   p_interval := 'monthly',
--   p_premake := 3
-- );

-- ── NOTIFICATIONS — Monthly partitions by created_at ─────────────────────
-- SELECT partman.create_parent(
--   p_parent_table := 'public.notifications',
--   p_control := 'created_at',
--   p_type := 'range',
--   p_interval := 'monthly',
--   p_premake := 2
-- );


-- ── MANUAL PARTITION CREATION (if pg_partman not available) ──────────────
-- Create partitions for current month + next 3 months

-- Example for audit_logs:
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
--   FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');


-- ── pg_partman MAINTENANCE CONFIGURATION ────────────────────────────────
-- Run this AFTER pg_partman creates the parent tables above

-- UPDATE partman.part_config
-- SET
--   retention              = '24 months',
--   retention_keep_table   = false,
--   retention_keep_index   = false,
--   infinite_time_partitions = true,
--   premake                = 3,
--   automatic_maintenance  = 'on'
-- WHERE parent_table IN (
--   'public.emi_schedules',
--   'public.repayment_events',
--   'public.audit_logs',
--   'public.notifications'
-- );


-- ── pg_cron: Daily partition maintenance at 2 AM IST ─────────────────────
-- SELECT cron.schedule('partman_maintenance', '30 20 * * *',
--   'SELECT partman.run_maintenance(p_analyze := false)'
-- );


-- ── ARCHIVAL: Move partitions older than 24 months to S3 via pg_cron ─────
-- SELECT cron.schedule('archive_old_partitions', '0 1 1 * *', $$
--   SELECT partman.drop_partition_id(
--     p_parent_table := 'public.audit_logs',
--     p_retention := '24 months',
--     p_keep_table := false
--   )
-- $$);
