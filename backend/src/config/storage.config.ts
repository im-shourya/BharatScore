import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
  },
  containers: {
    kyc: process.env.STORAGE_CONTAINER_KYC || 'credsaathi-kyc-prod',
    statements: process.env.STORAGE_CONTAINER_STATEMENTS || 'credsaathi-statements-prod',
    mlArtifacts: process.env.STORAGE_CONTAINER_ML_ARTIFACTS || 'credsaathi-ml-artifacts-prod',
    auditExports: process.env.STORAGE_CONTAINER_AUDIT_EXPORTS || 'credsaathi-audit-exports-prod',
  },
  presignedUrlExpiry: parseInt(process.env.STORAGE_PRESIGNED_URL_EXPIRY_SECONDS || '900', 10),
  maxUploadSize: parseInt(process.env.STORAGE_MAX_UPLOAD_SIZE_MB || '50', 10) * 1024 * 1024,
  uploadTimeout: parseInt(process.env.STORAGE_UPLOAD_TIMEOUT_MS || '120000', 10),
}));
