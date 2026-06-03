export const CACHE_KEYS = {
  SESSION: (jti: string) => `session:${jti}`,
  TOKEN_BLACKLIST: (jti: string) => `blacklist:${jti}`,
  OTP: (mobile: string) => `otp:${mobile}`,
  OTP_ATTEMPTS: (mobile: string) => `otp_attempts:${mobile}`,
  OTP_LOCK: (mobile: string) => `otp_lock:${mobile}`,
  FEATURES: (userId: string) => `features:${userId}`,
  SCORE_CACHE: (userId: string) => `score:${userId}`,
  CONSENT_CACHE: (userId: string) => `consent:${userId}`,
  RATE_LIMIT: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  CMS_CONTENT: (key: string, locale: string) => `cms:${key}:${locale}`,
  CMS_FAQ: (locale: string, category: string) => `cms_faq:${locale}:${category}`,
};
