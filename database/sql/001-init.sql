-- ============================================================================
-- BharatScore / CredSaathi — Complete PostgreSQL Schema DDL
-- Version: 1.0 | Production Grade
-- ============================================================================

-- Create database and extensions
-- NOTE: Run this from a superuser connection BEFORE running the rest
-- CREATE DATABASE credsaathi
--   WITH OWNER = credsaathi_admin
--   ENCODING = 'UTF8'
--   LOCALE = 'en_IN.UTF-8'
--   TEMPLATE = template0;

-- \c credsaathi

-- ── EXTENSIONS ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
-- CREATE EXTENSION IF NOT EXISTS "pg_partman";  -- Requires superuser; enable via RDS parameter group

-- ── TIMEZONE ────────────────────────────────────────────────────────────
SET timezone = 'Asia/Kolkata';
-- ALTER DATABASE credsaathi SET timezone TO 'Asia/Kolkata';

-- ── CUSTOM DOMAIN TYPES ─────────────────────────────────────────────────
CREATE DOMAIN mobile_number AS VARCHAR(15)
  CHECK (VALUE ~ '^\+91[6-9][0-9]{9}$');

CREATE DOMAIN currency_amount AS BIGINT
  CHECK (VALUE >= 0);

CREATE DOMAIN credit_score AS INTEGER
  CHECK (VALUE >= 300 AND VALUE <= 900);

CREATE DOMAIN percentage AS DECIMAL(8, 6)
  CHECK (VALUE >= 0 AND VALUE <= 1);

-- ── ENUM TYPES ──────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'borrower', 'lender', 'admin', 'compliance', 'support'
);

CREATE TYPE user_status AS ENUM (
  'pending', 'active', 'suspended', 'deleted', 'banned'
);

CREATE TYPE kyc_status AS ENUM (
  'pending',
  'aadhaar_verified',
  'pan_verified',
  'fully_verified',
  'liveness_passed',
  'failed',
  'expired'
);

CREATE TYPE data_source AS ENUM (
  'phone', 'bank', 'ecommerce', 'geolocation', 'merchant', 'psychometric'
);

CREATE TYPE consent_scope AS ENUM (
  'read', 'read_aggregate', 'read_process'
);

CREATE TYPE doc_type AS ENUM (
  'aadhaar_front', 'aadhaar_back', 'pan',
  'bank_statement', 'income_proof', 'itr',
  'selfie', 'selfie_with_id',
  'business_reg', 'gst_certificate',
  'udyam_certificate', 'trade_licence'
);

CREATE TYPE risk_band AS ENUM (
  'very_high', 'high', 'medium', 'low', 'very_low'
);

CREATE TYPE loan_state AS ENUM (
  'draft', 'submitted', 'under_review',
  'pending_second_approval',
  'approved', 'rejected',
  'disbursed', 'repaying',
  'closed', 'defaulted',
  'written_off'
);

CREATE TYPE loan_purpose AS ENUM (
  'working_capital', 'equipment_purchase', 'inventory',
  'business_expansion', 'personal_emergency', 'education',
  'medical', 'home_improvement', 'agriculture', 'other'
);

CREATE TYPE emi_status AS ENUM (
  'pending', 'paid', 'partially_paid',
  'late', 'waived', 'defaulted'
);

CREATE TYPE payment_mode AS ENUM (
  'imps', 'neft', 'rtgs', 'upi', 'nach', 'cash', 'cheque'
);

CREATE TYPE notification_channel AS ENUM (
  'sms', 'whatsapp', 'email', 'push', 'in_app'
);

CREATE TYPE notification_status AS ENUM (
  'queued', 'processing', 'sent', 'delivered', 'failed', 'bounced'
);


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 1: users
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE users (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number         VARCHAR(15)   NOT NULL UNIQUE,
  full_name_encrypted   TEXT,
  email_encrypted       TEXT,
  role                  user_role     NOT NULL DEFAULT 'borrower',
  status                user_status   NOT NULL DEFAULT 'pending',
  locale                VARCHAR(10)   NOT NULL DEFAULT 'en',
  fcm_token             TEXT,
  onboarding_step       SMALLINT      NOT NULL DEFAULT 0
                        CHECK (onboarding_step BETWEEN 0 AND 10),
  referral_code         VARCHAR(20)   UNIQUE,
  referred_by_id        UUID          REFERENCES users(id) ON DELETE SET NULL,
  deletion_requested_at TIMESTAMPTZ,
  deletion_scheduled_at TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  login_count           INTEGER       NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Prevent hard deletes — use status = 'deleted' instead
CREATE RULE no_delete_users AS ON DELETE TO users DO INSTEAD NOTHING;

COMMENT ON TABLE users IS 'Master identity table. No raw PII — all sensitive fields AES-256-GCM encrypted at application layer.';
COMMENT ON COLUMN users.mobile_number IS 'E.164 format Indian mobile. Unique system identifier.';
COMMENT ON COLUMN users.full_name_encrypted IS 'AES-256-GCM: format iv:authtag:ciphertext';
COMMENT ON COLUMN users.deletion_scheduled_at IS 'DPDP Act: data purge at this timestamp (72h after request)';


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 2: kyc_records
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE kyc_records (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  aadhaar_hash              VARCHAR(64),
  pan_hash                  VARCHAR(64),
  digilocker_ref            VARCHAR(300),
  digilocker_access_token   TEXT,
  verification_status       kyc_status    NOT NULL DEFAULT 'pending',
  liveness_check_status     VARCHAR(20),
  face_match_score          DECIMAL(5,2)  CHECK (face_match_score BETWEEN 0 AND 100),
  extracted_data_encrypted  JSONB,
  pan_verified_at           TIMESTAMPTZ,
  aadhaar_verified_at       TIMESTAMPTZ,
  liveness_verified_at      TIMESTAMPTZ,
  verified_at               TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ   DEFAULT NOW() + INTERVAL '1 year',
  failure_reason            TEXT,
  attempts                  SMALLINT      NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN kyc_records.aadhaar_hash IS 'SHA-256 of raw Aadhaar number. Never store raw Aadhaar.';
COMMENT ON COLUMN kyc_records.extracted_data_encrypted IS 'Encrypted JSONB: name, dob, address, gender. Never plaintext.';


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 3: sessions
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE sessions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_jti             VARCHAR(200)  NOT NULL UNIQUE,
  refresh_token_hash  VARCHAR(128)  NOT NULL UNIQUE,
  device_fingerprint  VARCHAR(300),
  ip_address          INET,
  user_agent          TEXT,
  platform            VARCHAR(50),
  app_version         VARCHAR(20),
  is_revoked          BOOLEAN       NOT NULL DEFAULT false,
  revoked_at          TIMESTAMPTZ,
  revoked_reason      VARCHAR(100),
  expires_at          TIMESTAMPTZ   NOT NULL,
  last_used_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 4: consent_records
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE consent_records (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_source                 data_source   NOT NULL,
  scope                       consent_scope NOT NULL DEFAULT 'read',
  is_active                   BOOLEAN       NOT NULL DEFAULT true,
  aa_handle                   VARCHAR(200),
  aa_consent_id               VARCHAR(300),
  aa_fip_id                   VARCHAR(100),
  purpose_code                VARCHAR(50)   NOT NULL DEFAULT 'CREDIT_SCORING',
  purpose_text                TEXT,
  consent_hash                VARCHAR(128)  NOT NULL,
  granted_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  valid_until                 TIMESTAMPTZ   NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  revoked_at                  TIMESTAMPTZ,
  data_deletion_scheduled_at  TIMESTAMPTZ,
  data_deleted_at             TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (user_id, data_source, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Consent is append-only: no updates, no deletes
CREATE RULE no_update_consent AS ON UPDATE TO consent_records DO INSTEAD NOTHING;
CREATE RULE no_delete_consent AS ON DELETE TO consent_records DO INSTEAD NOTHING;


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 5: documents
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE documents (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  doc_type            doc_type      NOT NULL,
  s3_key_encrypted    TEXT          NOT NULL,
  s3_bucket           VARCHAR(100)  NOT NULL,
  file_hash           VARCHAR(64)   NOT NULL,
  size_bytes          INTEGER       NOT NULL CHECK (size_bytes > 0),
  mime_type           VARCHAR(100)  NOT NULL,
  is_verified         BOOLEAN       NOT NULL DEFAULT false,
  verified_by         UUID          REFERENCES users(id),
  verified_at         TIMESTAMPTZ,
  is_deleted          BOOLEAN       NOT NULL DEFAULT false,
  deletion_reason     VARCHAR(200),
  hard_delete_at      TIMESTAMPTZ,
  hard_deleted_at     TIMESTAMPTZ,
  retention_years     SMALLINT      NOT NULL DEFAULT 7,
  uploaded_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, doc_type, is_deleted)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON COLUMN documents.s3_key_encrypted IS 'AES-256-GCM encrypted S3 object key. Decrypt at app layer to get actual path.';
COMMENT ON COLUMN documents.file_hash IS 'SHA-256 of original (pre-encryption) file for integrity verification.';
COMMENT ON COLUMN documents.retention_years IS 'RBI requires 7 years minimum for loan-related documents.';


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 6: credit_scores
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE credit_scores (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score               INTEGER       NOT NULL CHECK (score BETWEEN 300 AND 900),
  risk_band           risk_band     NOT NULL,
  model1_pd           DECIMAL(10,8) NOT NULL CHECK (model1_pd BETWEEN 0 AND 1),
  model2_risk         DECIMAL(10,8) NOT NULL CHECK (model2_risk BETWEEN 0 AND 1),
  model3_stability    DECIMAL(10,8) NOT NULL CHECK (model3_stability BETWEEN 0 AND 1),
  ensemble_pd         DECIMAL(10,8) NOT NULL CHECK (ensemble_pd BETWEEN 0 AND 1),
  shap_values         JSONB         NOT NULL DEFAULT '[]',
  feature_version     VARCHAR(20)   NOT NULL,
  model_version       VARCHAR(30)   NOT NULL,
  data_completeness   JSONB         NOT NULL DEFAULT '{}',
  features_snapshot   JSONB,
  is_valid            BOOLEAN       NOT NULL DEFAULT true,
  invalidated_at      TIMESTAMPTZ,
  invalidation_reason TEXT,
  generated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Scores are immutable: never update a score, create a new one
CREATE RULE no_update_scores AS ON UPDATE TO credit_scores DO INSTEAD NOTHING;

COMMENT ON COLUMN credit_scores.features_snapshot IS 'Snapshot of all 40+ feature values at time of scoring. Used for model auditing.';
COMMENT ON COLUMN credit_scores.shap_values IS 'Array of {feature, contribution, direction, value, percentile} objects.';


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 7: loan_applications
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE loan_applications (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score_id              UUID          REFERENCES credit_scores(id),
  lender_id             UUID          REFERENCES users(id),
  second_approver_id    UUID          REFERENCES users(id),
  amount_requested      BIGINT        NOT NULL CHECK (amount_requested BETWEEN 1000 AND 50000000),
  amount_approved       BIGINT        CHECK (amount_approved > 0),
  tenure_months         SMALLINT      NOT NULL CHECK (tenure_months BETWEEN 1 AND 60),
  purpose               loan_purpose  NOT NULL,
  purpose_description   TEXT,
  state                 loan_state    NOT NULL DEFAULT 'draft',
  interest_rate         DECIMAL(6,3)  CHECK (interest_rate BETWEEN 0 AND 100),
  processing_fee        BIGINT        DEFAULT 0,
  rejection_reason      TEXT,
  rejection_code        VARCHAR(50),
  disbursement_account  TEXT,
  disbursement_utr      VARCHAR(50),
  applied_at            TIMESTAMPTZ,
  decided_at            TIMESTAMPTZ,
  disbursed_at          TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  dpd_90_triggered_at   TIMESTAMPTZ,
  metadata              JSONB         NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN loan_applications.amount_requested IS 'In Indian Paise (1 INR = 100 paise) for precision. Display as INR/100.';
COMMENT ON COLUMN loan_applications.disbursement_account IS 'Encrypted beneficiary account details.';


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 8: loan_state_transitions
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE loan_state_transitions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         UUID          NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  actor_id        UUID          REFERENCES users(id),
  from_state      loan_state    NOT NULL,
  to_state        loan_state    NOT NULL,
  reason          TEXT,
  metadata        JSONB         NOT NULL DEFAULT '{}',
  ip_address      INET,
  transitioned_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_transition CHECK (from_state != to_state)
);

-- Append-only: the history must never be altered
CREATE RULE no_delete_transitions AS ON DELETE TO loan_state_transitions DO INSTEAD NOTHING;
CREATE RULE no_update_transitions AS ON UPDATE TO loan_state_transitions DO INSTEAD NOTHING;


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 9: emi_schedules (PARTITIONED BY RANGE on due_date)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE emi_schedules (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id               UUID          NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  installment_number    SMALLINT      NOT NULL CHECK (installment_number > 0),
  principal_amount      BIGINT        NOT NULL CHECK (principal_amount > 0),
  interest_amount       BIGINT        NOT NULL CHECK (interest_amount >= 0),
  total_amount_due      BIGINT        NOT NULL,
  amount_paid           BIGINT        NOT NULL DEFAULT 0,
  outstanding_principal BIGINT,
  due_date              DATE          NOT NULL,
  status                emi_status    NOT NULL DEFAULT 'pending',
  days_past_due         INTEGER       NOT NULL DEFAULT 0,
  late_fee              BIGINT        NOT NULL DEFAULT 0,
  waiver_amount         BIGINT        NOT NULL DEFAULT 0,
  waiver_reason         TEXT,
  UNIQUE (loan_id, installment_number)
);
-- NOTE: Partitioning (PARTITION BY RANGE (due_date)) is configured in 002-partitioning.sql


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 10: repayment_events (PARTITIONED BY RANGE on paid_at)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE repayment_events (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id           UUID          NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  emi_id            UUID          NOT NULL REFERENCES emi_schedules(id),
  amount_paid       BIGINT        NOT NULL CHECK (amount_paid > 0),
  payment_mode      payment_mode  NOT NULL,
  utr_number        VARCHAR(50)   UNIQUE,
  bank_reference    VARCHAR(100),
  days_late         INTEGER       NOT NULL DEFAULT 0,
  is_partial        BOOLEAN       NOT NULL DEFAULT false,
  bank_response     JSONB,
  reconciled        BOOLEAN       NOT NULL DEFAULT false,
  reconciled_at     TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- NOTE: Partitioning configured in 002-partitioning.sql


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 11: audit_logs (PARTITIONED BY RANGE on logged_at)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE audit_logs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID          REFERENCES users(id),
  actor_role      VARCHAR(50),
  entity_type     VARCHAR(50)   NOT NULL,
  entity_id       UUID,
  action          VARCHAR(100)  NOT NULL,
  payload_hash    VARCHAR(64)   NOT NULL,
  prev_hash       VARCHAR(64),
  ip_address      INET,
  user_agent      TEXT,
  request_id      VARCHAR(50),
  metadata        JSONB         NOT NULL DEFAULT '{}',
  logged_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- NOTE: Partitioning configured in 002-partitioning.sql

-- Audit logs are immutable
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;


-- ════════════════════════════════════════════════════════════════════════
-- TABLE 12: notifications (PARTITIONED BY RANGE on created_at)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                  NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  channel           notification_channel  NOT NULL,
  event_type        VARCHAR(100)          NOT NULL,
  template_id       VARCHAR(100),
  content_encrypted TEXT,
  locale            VARCHAR(10)           NOT NULL DEFAULT 'en',
  status            notification_status   NOT NULL DEFAULT 'queued',
  retry_count       SMALLINT              NOT NULL DEFAULT 0,
  max_retries       SMALLINT              NOT NULL DEFAULT 3,
  provider          VARCHAR(50),
  provider_msg_id   VARCHAR(200),
  provider_response JSONB,
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);
-- NOTE: Partitioning configured in 002-partitioning.sql


-- ════════════════════════════════════════════════════════════════════════
-- CMS TABLES
-- ════════════════════════════════════════════════════════════════════════

-- cms_content: all translatable content
CREATE TABLE cms_content (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(200)  NOT NULL,
  locale        VARCHAR(10)   NOT NULL,
  namespace     VARCHAR(50)   NOT NULL,
  content       JSONB         NOT NULL,
  version       INTEGER       NOT NULL DEFAULT 1,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  published_at  TIMESTAMPTZ,
  created_by    UUID          REFERENCES users(id),
  updated_by    UUID          REFERENCES users(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (key, locale)
);

-- cms_faqs
CREATE TABLE cms_faqs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(50)   NOT NULL,
  question    TEXT          NOT NULL,
  answer      TEXT          NOT NULL,
  locale      VARCHAR(10)   NOT NULL DEFAULT 'en',
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  tags        TEXT[],
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- cms_loan_products
CREATE TABLE cms_loan_products (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code          VARCHAR(50)   NOT NULL UNIQUE,
  name_json             JSONB         NOT NULL,
  description_json      JSONB         NOT NULL,
  min_amount            BIGINT        NOT NULL,
  max_amount            BIGINT        NOT NULL,
  min_tenure_months     SMALLINT      NOT NULL,
  max_tenure_months     SMALLINT      NOT NULL,
  interest_rate_min     DECIMAL(6,3)  NOT NULL,
  interest_rate_max     DECIMAL(6,3)  NOT NULL,
  processing_fee_pct    DECIMAL(5,3)  NOT NULL DEFAULT 0,
  eligible_risk_bands   risk_band[]   NOT NULL,
  min_score             INTEGER       NOT NULL DEFAULT 300,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- cms_questionnaire_questions
CREATE TABLE cms_questionnaire_questions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  version         VARCHAR(10)   NOT NULL,
  q_number        SMALLINT      NOT NULL,
  group_name      VARCHAR(50)   NOT NULL,
  question_json   JSONB         NOT NULL,
  options_json    JSONB         NOT NULL,
  scoring_rule    JSONB         NOT NULL,
  weight          DECIMAL(5,4)  NOT NULL DEFAULT 1.0,
  is_mandatory    BOOLEAN       NOT NULL DEFAULT true,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  UNIQUE (version, q_number)
);
