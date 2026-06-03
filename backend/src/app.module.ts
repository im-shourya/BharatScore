import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

import { DatabaseModule } from './shared/database/database.module';
import { CacheModule } from './shared/cache/cache.module';
import { EncryptionModule } from './shared/encryption/encryption.module';

import { AuthModule } from './modules/auth/auth.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CustomThrottlerGuard } from './guards/throttler.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 10000, limit: 30 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    // Shared infrastructure
    DatabaseModule,
    CacheModule,
    EncryptionModule,

    // Feature modules
    AuthModule,
  ],
  providers: [
    // Global guards (applied to all routes)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },

    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },

    // Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
