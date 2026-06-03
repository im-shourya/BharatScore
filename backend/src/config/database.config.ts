import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Primary
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'credsaathi',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  ssl: process.env.POSTGRES_SSL === 'true',
  sslCaPath: process.env.POSTGRES_SSL_CA || '',
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '50', 10),
  minConnections: parseInt(process.env.POSTGRES_MIN_CONNECTIONS || '5', 10),
  idleTimeoutMs: parseInt(process.env.POSTGRES_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMs: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT_MS || '3000', 10),
  statementTimeoutMs: parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT_MS || '15000', 10),
  slowQueryThresholdMs: parseInt(process.env.POSTGRES_SLOW_QUERY_THRESHOLD_MS || '1000', 10),
  // Read replica
  replicaHost: process.env.POSTGRES_REPLICA_HOST || '',
  replicaUser: process.env.POSTGRES_REPLICA_USER || '',
  replicaPassword: process.env.POSTGRES_REPLICA_PASSWORD || '',
  replicaMaxConnections: parseInt(process.env.POSTGRES_REPLICA_MAX_CONNECTIONS || '30', 10),
}));
