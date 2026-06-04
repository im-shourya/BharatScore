/**
 * Redis cache key patterns — Full keyspace map (Section 11).
 *
 * Pattern: cs:{namespace}:{identifier}:{sub-key}
 * Prefix is configurable via REDIS_KEY_PREFIX env var.
 */
export const CACHE_KEYS = {
  // ── Authentication ───────────────────────────────────────────────────
  OTP: (mobile: string) => `otp:${mobile}`,
  OTP_ATTEMPTS: (mobile: string) => `otp_attempts:${mobile}`,
  OTP_LOCK: (mobile: string) => `otp_lock:${mobile}`,
  SESSION: (jti: string) => `session:${jti}`,
  BLACKLIST: (jti: string) => `blacklist:${jti}`,
  REFRESH: (hash: string) => `refresh:${hash}`,

  // ── Feature Store ────────────────────────────────────────────────────
  FEATURES: (userId: string) => `features:${userId}`,
  FEATURES_BEHAVIORAL: (userId: string) => `features:${userId}:behavioral`,
  FEATURES_PSYCHO: (userId: string) => `features:${userId}:psycho`,
  FEATURES_CASHFLOW: (userId: string) => `features:${userId}:cashflow`,

  // ── Scoring & Consent ────────────────────────────────────────────────
  SCORE: (userId: string) => `score:${userId}`,
  CONSENT: (userId: string) => `consent:${userId}`,
  KYC_SESSION: (sessionId: string) => `kyc_session:${sessionId}`,

  // ── CMS Cache ────────────────────────────────────────────────────────
  CMS: (key: string, locale: string) => `cms:${key}:${locale}`,
  CMS_FAQ: (locale: string, category: string) => `cms:faq:${locale}:${category}`,
  CMS_PRODUCTS: (locale: string) => `cms:products:${locale}`,
  CMS_QUESTIONNAIRE: (locale: string) => `cms:questionnaire:${locale}`,

  // ── Rate Limiting ────────────────────────────────────────────────────
  RATE_IP: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  RATE_USER: (userId: string, endpoint: string) => `rate:user:${userId}:${endpoint}`,

  // ── Loan Pipeline Cache ──────────────────────────────────────────────
  PIPELINE: (lenderId: string, state: string) => `pipeline:${lenderId}:${state}`,
  LOAN: (loanId: string) => `loan:${loanId}`,
} as const;

/**
 * TTL constants in seconds.
 */
export const CACHE_TTL = {
  OTP: 300,                // 5 minutes
  OTP_ATTEMPTS: 300,       // 5 minutes
  OTP_LOCK: 1800,          // 30 minutes
  SESSION: 900,            // 15 minutes
  BLACKLIST: 900,          // 15 minutes
  REFRESH: 604800,         // 7 days
  FEATURES: 86400,         // 24 hours
  FEATURES_PSYCHO: 0,     // persist (no expiry)
  FEATURES_CASHFLOW: 604800, // 7 days
  SCORE: 3600,             // 1 hour
  CONSENT: 600,            // 10 minutes
  KYC_SESSION: 600,        // 10 minutes
  CMS: 3600,               // 1 hour
  CMS_FAQ: 3600,           // 1 hour
  CMS_PRODUCTS: 7200,      // 2 hours
  CMS_QUESTIONNAIRE: 86400, // 24 hours
  RATE: 60,                // 1 minute
  PIPELINE: 300,           // 5 minutes
  LOAN: 300,               // 5 minutes
} as const;
