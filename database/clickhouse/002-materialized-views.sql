-- ============================================================================
-- BharatScore / CredSaathi — ClickHouse Materialized Views & Analytical Queries
-- Section 14 of the database specification
-- ============================================================================

USE credsaathi_analytics;

-- ── MATERIALIZED VIEW: daily score distribution ───────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_score_distribution
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (snapshot_date, risk_band)
AS
SELECT
  toDate(generated_at)           AS snapshot_date,
  risk_band,
  count()                        AS count,
  avg(score)                     AS avg_score,
  min(score)                     AS min_score,
  max(score)                     AS max_score
FROM model_predictions
GROUP BY snapshot_date, risk_band;

-- ── MATERIALIZED VIEW: monthly default rates ──────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_default_rates
ENGINE = SummingMergeTree()
ORDER BY (month, risk_band)
AS
SELECT
  toStartOfMonth(applied_at)     AS month,
  risk_band,
  count()                        AS total_loans,
  countIf(outcome = 'defaulted') AS defaults,
  countIf(outcome = 'repaid')    AS repaid,
  avg(amount_approved)           AS avg_loan_amount
FROM loan_outcomes
GROUP BY month, risk_band;


-- ════════════════════════════════════════════════════════════════════════
-- ANALYTICAL QUERIES (for dashboards & compliance reports)
-- ════════════════════════════════════════════════════════════════════════

-- ── Fairness audit by state ───────────────────────────────────────────
-- SELECT
--   state_code,
--   count()                                       AS applications,
--   countIf(state = 'approved' OR state = 'disbursed') / count() AS approval_rate,
--   avg(score)                                    AS avg_score
-- FROM loan_outcomes
-- WHERE applied_at >= today() - 90
-- GROUP BY state_code
-- ORDER BY approval_rate DESC;

-- ── PSI computation (Population Stability Index) ─────────────────────
-- SELECT
--   feature_name,
--   snapshot_date,
--   (sum((p_score - p_base) * log(p_score / p_base))) AS psi
-- FROM (
--   SELECT
--     f_current.feature_name,
--     f_current.snapshot_date,
--     f_current.mean / sum_current.total AS p_score,
--     f_base.mean    / sum_base.total    AS p_base
--   FROM feature_distributions AS f_current
--   JOIN feature_distributions AS f_base
--     ON f_current.feature_name = f_base.feature_name
--   WHERE f_current.snapshot_date = today()
--     AND f_base.snapshot_date    = today() - 30
-- )
-- GROUP BY feature_name, snapshot_date
-- HAVING psi > 0.1
-- ORDER BY psi DESC;

-- ── NPA report ────────────────────────────────────────────────────────
-- SELECT
--   toStartOfMonth(disbursed_at)  AS month,
--   risk_band,
--   count()                        AS loans_disbursed,
--   sum(amount_approved)           AS total_disbursed,
--   countIf(outcome='defaulted')   AS npa_count,
--   sum(CASE WHEN outcome='defaulted' THEN amount_approved ELSE 0 END) AS npa_amount,
--   npa_amount / total_disbursed   AS npa_ratio
-- FROM loan_outcomes
-- WHERE disbursed_at IS NOT NULL
-- GROUP BY month, risk_band
-- ORDER BY month DESC, risk_band;
