export enum KycStatus {
  PENDING = 'pending',
  AADHAAR_VERIFIED = 'aadhaar_verified',
  PAN_VERIFIED = 'pan_verified',
  FULLY_VERIFIED = 'fully_verified',
  LIVENESS_PASSED = 'liveness_passed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}
