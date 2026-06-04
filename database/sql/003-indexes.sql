-- ============================================================================
-- BharatScore / CredSaathi — All Indexes & Constraints
-- Run AFTER 001-init.sql
-- ============================================================================

-- ── USERS ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile ON users (mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled ON users (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL AND status != 'deleted';

-- ── SESSIONS ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_jti ON sessions (jwt_jti);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions (user_id, expires_at)
  WHERE is_revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)
  WHERE is_revoked = false;

-- ── KYC ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_user ON kyc_records (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_records (verification_status);

-- ── CONSENT ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consent_user_source ON consent_records (user_id, data_source, is_active);
CREATE INDEX IF NOT EXISTS idx_consent_deletion ON consent_records (data_deletion_scheduled_at)
  WHERE data_deletion_scheduled_at IS NOT NULL AND data_deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consent_expiry ON consent_records (valid_until)
  WHERE is_active = true;

-- ── DOCUMENTS ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_docs_user_type ON documents (user_id, doc_type)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_docs_hard_delete ON documents (hard_delete_at)
  WHERE hard_delete_at IS NOT NULL AND hard_deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_docs_hash ON documents (file_hash)
  WHERE is_deleted = false;

-- ── CREDIT SCORES ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scores_user_date ON credit_scores (user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_band ON credit_scores (risk_band, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_model ON credit_scores (model_version, generated_at DESC);

-- ── LOAN APPLICATIONS ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loans_user_state ON loan_applications (user_id, state);
CREATE INDEX IF NOT EXISTS idx_loans_lender_state ON loan_applications (lender_id, state, applied_at DESC)
  WHERE lender_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loans_submitted ON loan_applications (applied_at DESC)
  WHERE state = 'submitted';
CREATE INDEX IF NOT EXISTS idx_loans_active ON loan_applications (user_id)
  WHERE state NOT IN ('rejected', 'closed', 'written_off', 'draft');
CREATE INDEX IF NOT EXISTS idx_loans_band ON loan_applications (state) INCLUDE (amount_requested, interest_rate);

-- ── EMI SCHEDULES ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emi_loan ON emi_schedules (loan_id, installment_number);
CREATE INDEX IF NOT EXISTS idx_emi_due ON emi_schedules (due_date, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_emi_overdue ON emi_schedules (due_date, days_past_due)
  WHERE status = 'pending' AND days_past_due > 0;

-- ── REPAYMENT EVENTS ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_repayment_loan ON repayment_events (loan_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_repayment_emi ON repayment_events (emi_id);
CREATE INDEX IF NOT EXISTS idx_repayment_unreconciled ON repayment_events (paid_at)
  WHERE reconciled = false;

-- ── AUDIT LOGS ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action, logged_at DESC);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notifications (status, scheduled_at)
  WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_notif_retry ON notifications (retry_count, created_at)
  WHERE status = 'failed' AND retry_count < max_retries;

-- ── CMS ──────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_key_locale ON cms_content (key, locale)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cms_namespace ON cms_content (namespace, locale);
CREATE INDEX IF NOT EXISTS idx_faq_category_locale ON cms_faqs (category, locale)
  WHERE is_active = true;
