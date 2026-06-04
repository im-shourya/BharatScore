-- ============================================================================
-- BharatScore / CredSaathi — ClickHouse Analytics Schema
-- Section 13 of the database specification
-- ============================================================================

CREATE DATABASE IF NOT EXISTS credsaathi_analytics;

USE credsaathi_analytics;

-- ── MODEL PREDICTIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_predictions
(
  id                String,
  user_id           String,
  score             UInt16,
  risk_band         Enum8('very_high'=1,'high'=2,'medium'=3,'low'=4,'very_low'=5),
  model1_pd         Float32,
  model2_risk       Float32,
  model3_stability  Float32,
  ensemble_pd       Float32,
  model_version     String,
  feature_version   String,
  shap_values       String,          -- JSON serialised
  data_completeness String,          -- JSON serialised
  features_snapshot String,          -- JSON serialised
  loan_id           Nullable(String),
  generated_at      DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(generated_at)
ORDER BY (user_id, generated_at)
TTL generated_at + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;

-- ── LOAN OUTCOMES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_outcomes
(
  loan_id           String,
  user_id           String,
  score_id          String,
  score             UInt16,
  risk_band         String,
  amount_requested  UInt64,
  amount_approved   Nullable(UInt64),
  interest_rate     Nullable(Float32),
  tenure_months     UInt8,
  state             String,
  outcome           Enum8('repaid'=1,'defaulted'=2,'prepaid'=3,'active'=4,'rejected'=5),
  days_to_default   Nullable(UInt16),
  total_paid        UInt64,
  dpd_max           UInt16,
  applied_at        DateTime('Asia/Kolkata'),
  decided_at        Nullable(DateTime('Asia/Kolkata')),
  disbursed_at      Nullable(DateTime('Asia/Kolkata')),
  closed_at         Nullable(DateTime('Asia/Kolkata')),
  lender_id         Nullable(String),
  state_code        String,
  city_tier         UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(applied_at)
ORDER BY (applied_at, user_id)
TTL applied_at + INTERVAL 10 YEAR;

-- ── FEATURE DISTRIBUTIONS (for PSI monitoring) ───────────────────────
CREATE TABLE IF NOT EXISTS feature_distributions
(
  feature_name    String,
  feature_version String,
  snapshot_date   Date,
  mean            Float64,
  std_dev         Float64,
  min_val         Float64,
  max_val         Float64,
  p5              Float64,
  p25             Float64,
  p50             Float64,
  p75             Float64,
  p95             Float64,
  sample_count    UInt32,
  null_count      UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (snapshot_date, feature_name, feature_version)
TTL snapshot_date + INTERVAL 2 YEAR;

-- ── AUDIT EVENTS (from Kafka, archived from PostgreSQL) ───────────────
CREATE TABLE IF NOT EXISTS audit_events
(
  id           String,
  actor_id     Nullable(String),
  actor_role   String,
  entity_type  String,
  entity_id    Nullable(String),
  action       String,
  payload_hash String,
  prev_hash    Nullable(String),
  ip_address   Nullable(String),
  request_id   Nullable(String),
  metadata     String,       -- JSON
  logged_at    DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(logged_at)
ORDER BY (logged_at, entity_type, entity_id)
TTL logged_at + INTERVAL 7 YEAR;

-- ── NOTIFICATION LOGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs
(
  id                String,
  user_id           String,
  channel           String,
  event_type        String,
  status            String,
  provider          String,
  retry_count       UInt8,
  locale            String,
  sent_at           Nullable(DateTime('Asia/Kolkata')),
  delivered_at      Nullable(DateTime('Asia/Kolkata')),
  failed_at         Nullable(DateTime('Asia/Kolkata')),
  created_at        DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id)
TTL created_at + INTERVAL 1 YEAR;

-- ── MODEL DRIFT METRICS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_drift_metrics
(
  model_version   String,
  feature_version String,
  metric_date     Date,
  metric_name     String,
  metric_value    Float64,
  threshold       Float64,
  is_alerting     UInt8,
  computed_at     DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
ORDER BY (metric_date, model_version, metric_name)
TTL metric_date + INTERVAL 2 YEAR;
