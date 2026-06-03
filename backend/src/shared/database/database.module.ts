import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        database: config.get('database.database'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
        ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
        synchronize: process.env.NODE_ENV === 'development', // Auto-sync in dev only
        migrationsRun: true,
        logging: process.env.NODE_ENV === 'development',
        extra: {
          max: config.get('database.maxConnections'),
          idleTimeoutMillis: config.get('database.idleTimeoutMs'),
          connectionTimeoutMillis: 3000,
        },
        poolErrorHandler: (err: Error) => console.error('Pool error:', err),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
