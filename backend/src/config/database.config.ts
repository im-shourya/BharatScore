import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'credsaathi',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  ssl: process.env.POSTGRES_SSL === 'true',
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '50', 10),
  idleTimeoutMs: parseInt(process.env.POSTGRES_IDLE_TIMEOUT_MS || '30000', 10),
}));
