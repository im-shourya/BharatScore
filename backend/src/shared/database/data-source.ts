import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Standalone TypeORM DataSource for CLI migration commands.
 *
 * Usage:
 *   npx typeorm migration:generate -d src/shared/database/data-source.ts
 *   npx typeorm migration:run -d src/shared/database/data-source.ts
 *   npx typeorm migration:revert -d src/shared/database/data-source.ts
 *   npx typeorm migration:show -d src/shared/database/data-source.ts
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'credsaathi',
  ssl: process.env.POSTGRES_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: ['migration'],
});
