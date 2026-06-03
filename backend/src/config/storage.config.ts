import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  buckets: {
    kyc: process.env.S3_BUCKET_KYC || 'credsaathi-kyc-prod',
    statements: process.env.S3_BUCKET_STATEMENTS || 'credsaathi-statements-prod',
    mlArtifacts: process.env.S3_BUCKET_ML_ARTIFACTS || 'credsaathi-ml-artifacts-prod',
    auditExports: process.env.S3_BUCKET_AUDIT_EXPORTS || 'credsaathi-audit-exports-prod',
  },
  presignedUrlExpiry: parseInt(process.env.S3_PRESIGNED_URL_EXPIRY_SECONDS || '900', 10),
  maxUploadSize: parseInt(process.env.S3_MAX_UPLOAD_SIZE_MB || '50', 10) * 1024 * 1024,
  uploadTimeout: parseInt(process.env.S3_UPLOAD_TIMEOUT_MS || '120000', 10),
  kmsKeyArn: process.env.AWS_KMS_KEY_ARN || '',
  kmsKeyArnStatements: process.env.AWS_KMS_KEY_ARN_STATEMENTS || '',
  objectLockEnabled: process.env.S3_OBJECT_LOCK_ENABLED === 'true',
  versioningEnabled: process.env.S3_VERSIONING_ENABLED === 'true',
  // MinIO (local/staging)
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
  },
}));
