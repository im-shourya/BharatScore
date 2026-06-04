import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Module({
  imports: [
    // ── Primary (write) connection ────────────────────────────────────
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        database: config.get('database.database'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        ssl: config.get('database.ssl')
          ? {
              ca: config.get('database.sslCaPath')
                ? fs.readFileSync(config.get<string>('database.sslCaPath') as string)
                : undefined,
              rejectUnauthorized: false,
            }
          : false,
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: process.env.RUN_MIGRATIONS === 'true',
        logging:
          process.env.NODE_ENV === 'development'
            ? 'all'
            : ['error', 'migration'],
        maxQueryExecutionTime: config.get<number>(
          'database.slowQueryThresholdMs',
          1000,
        ),
        extra: {
          max: config.get<number>('database.maxConnections', 50),
          min: config.get<number>('database.minConnections', 5),
          idleTimeoutMillis: config.get<number>(
            'database.idleTimeoutMs',
            30000,
          ),
          connectionTimeoutMillis: config.get<number>(
            'database.connectionTimeoutMs',
            3000,
          ),
          statement_timeout: config.get<number>(
            'database.statementTimeoutMs',
            15000,
          ),
        },
        poolErrorHandler: (err: Error) => {
          console.error('[DB Pool Error]', err.message);
        },
      }),
      inject: [ConfigService],
    }),

    // ── Read replica connection ───────────────────────────────────────
    TypeOrmModule.forRootAsync({
      name: 'replica',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const replicaHost = config.get('database.replicaHost');

        // Skip replica if not configured (dev/local)
        if (!replicaHost) {
          return {
            type: 'postgres',
            host: config.get('database.host'),
            port: config.get<number>('database.port'),
            database: config.get('database.database'),
            username: config.get('database.username'),
            password: config.get('database.password'),
            ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: false,
          };
        }

        return {
          type: 'postgres',
          host: replicaHost,
          port: config.get<number>('database.port'),
          database: config.get('database.database'),
          username: config.get('database.replicaUser', config.get('database.username')),
          password: config.get('database.replicaPassword', config.get('database.password')),
          ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: false,
          extra: {
            max: config.get<number>('database.replicaMaxConnections', 30),
            application_name: 'credsaathi-api-replica',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
