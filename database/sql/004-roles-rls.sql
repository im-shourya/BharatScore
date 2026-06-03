-- ============================================================================
-- BharatScore / CredSaathi — Database Roles, Permissions & Row-Level Security
-- Section 28 of the database specification
-- ============================================================================

-- ── CREATE APPLICATION ROLES ─────────────────────────────────────────────
CREATE ROLE credsaathi_app        LOGIN PASSWORD 'app_password';
CREATE ROLE credsaathi_readonly   LOGIN PASSWORD 'readonly_password';
CREATE ROLE credsaathi_ml         LOGIN PASSWORD 'ml_password';
CREATE ROLE credsaathi_admin      LOGIN PASSWORD 'admin_password';
CREATE ROLE credsaathi_compliance LOGIN PASSWORD 'compliance_password';

-- ── APP ROLE: Full CRUD on all tables (NO DELETE — all deletes are logical)
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_app;
GRANT USAGE ON SCHEMA public TO credsaathi_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO credsaathi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO credsaathi_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM credsaathi_app;

-- ── READ-ONLY ROLE: For replicas and reporting
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_readonly;
GRANT USAGE ON SCHEMA public TO credsaathi_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO credsaathi_readonly;

-- ── ML ROLE: Read features + write scores
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_ml;
GRANT SELECT ON credit_scores, users, kyc_records TO credsaathi_ml;
GRANT INSERT ON credit_scores TO credsaathi_ml;

-- ── COMPLIANCE ROLE: Read everything, no write
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_compliance;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO credsaathi_compliance;

-- ── ADMIN: Full access
GRANT ALL PRIVILEGES ON DATABASE credsaathi TO credsaathi_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO credsaathi_admin;

-- ── DEFAULT PRIVILEGES (for future tables) ───────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO credsaathi_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO credsaathi_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO credsaathi_compliance;


-- ════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════

-- Users can only see their own loan applications
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_own_loans ON loan_applications
  USING (user_id = current_setting('app.user_id')::uuid);

-- Users can only see their own EMI schedules
ALTER TABLE emi_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_own_emis ON emi_schedules
  USING (
    loan_id IN (
      SELECT id FROM loan_applications
      WHERE user_id = current_setting('app.user_id')::uuid
    )
  );

-- NOTE: RLS is enforced per-request by setting:
--   SET LOCAL app.user_id = '{userId}';
-- This is called in the NestJS TypeORM interceptor before each query.
-- Admin/lender roles bypass RLS via GRANT BYPASSRLS or role-based checks.
