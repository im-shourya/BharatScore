-- ============================================================================
-- BharatScore / CredSaathi — Data Retention Scheduled Jobs
-- Requires: pg_cron extension enabled
-- Section 26 of the database specification
-- ============================================================================

-- ── 1. Hard delete S3 documents scheduled for deletion (daily at 2 AM) ────
-- SELECT cron.schedule('hard_delete_documents', '0 2 * * *', $$
--   UPDATE documents
--   SET hard_deleted_at = NOW()
--   WHERE is_deleted = true
--     AND hard_delete_at <= NOW()
--     AND hard_deleted_at IS NULL
--   RETURNING id, s3_key_encrypted, s3_bucket;
-- $$);

-- ── 2. Complete data deletion for DPDP requests (daily at 2:30 AM) ─────────
-- SELECT cron.schedule('complete_user_deletion', '30 2 * * *', $$
--   UPDATE users
--   SET
--     full_name_encrypted = NULL,
--     email_encrypted = NULL,
--     fcm_token = NULL,
--     status = 'deleted'
--   WHERE
--     deletion_scheduled_at <= NOW()
--     AND status != 'deleted';
-- $$);

-- ── 3. Expire stale sessions (daily at 3 AM) ─────────────────────────────
-- SELECT cron.schedule('purge_sessions', '0 3 * * *', $$
--   DELETE FROM sessions
--   WHERE expires_at < NOW() - INTERVAL '7 days';
-- $$);

-- ── 4. Prune old delivered/failed notifications (monthly on 1st at 4 AM) ──
-- SELECT cron.schedule('prune_notifications', '0 4 1 * *', $$
--   DELETE FROM notifications
--   WHERE created_at < NOW() - INTERVAL '90 days'
--     AND status IN ('delivered', 'failed');
-- $$);


-- ════════════════════════════════════════════════════════════════════════
-- RETENTION SCHEDULE REFERENCE
-- ════════════════════════════════════════════════════════════════════════
-- | Data type             | Location              | Retention    | Legal basis             |
-- |-----------------------|-----------------------|--------------|-------------------------|
-- | KYC documents         | S3                    | 7 years      | RBI mandate             |
-- | Bank statements       | S3                    | 24 months    | DPDP data minimisation  |
-- | Raw behavioral data   | MongoDB               | 24 months    | DPDP data minimisation  |
-- | Loan records          | PostgreSQL            | 10 years     | RBI                     |
-- | EMI/repayment         | PostgreSQL            | 10 years     | RBI                     |
-- | Audit logs            | PostgreSQL+ClickHouse | 7 years      | RBI                     |
-- | Credit scores         | PostgreSQL            | 7 years      | RBI                     |
-- | Session tokens        | PostgreSQL            | 30 days      | Auth ops                |
-- | OTP cache             | Redis                 | 5 minutes    | Functional              |
-- | Notifications         | PostgreSQL            | 90 days      | Operational             |
