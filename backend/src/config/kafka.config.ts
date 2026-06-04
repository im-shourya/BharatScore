import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  clientId: process.env.KAFKA_CLIENT_ID || 'credsaathi-api',
  groupId: process.env.KAFKA_GROUP_ID || 'credsaathi-main-consumers',
  featureGroupId: process.env.KAFKA_FEATURE_GROUP_ID || 'credsaathi-feature-consumers',
  auditGroupId: process.env.KAFKA_AUDIT_GROUP_ID || 'credsaathi-audit-consumers',
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: {
    mechanism: process.env.KAFKA_SASL_MECHANISM || 'SCRAM-SHA-256',
    username: process.env.KAFKA_SASL_USERNAME || '',
    password: process.env.KAFKA_SASL_PASSWORD || '',
  },
  connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT_MS || '3000', 10),
  requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT_MS || '25000', 10),
  retry: {
    retries: parseInt(process.env.KAFKA_RETRY_MAX_RETRIES || '5', 10),
    initialRetryTime: parseInt(process.env.KAFKA_RETRY_INITIAL_RETRY_TIME_MS || '300', 10),
    multiplier: parseInt(process.env.KAFKA_RETRY_MULTIPLIER || '2', 10),
  },
  sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT_MS || '30000', 10),
  rebalanceTimeout: parseInt(process.env.KAFKA_REBALANCE_TIMEOUT_MS || '60000', 10),
  heartbeatInterval: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL_MS || '3000', 10),
}));
