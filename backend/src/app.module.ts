import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import mongodbConfig from './config/mongodb.config';
import kafkaConfig from './config/kafka.config';
import storageConfig from './config/storage.config';
import smsConfig from './config/sms.config';
import { DatabaseModule } from './shared/database/database.module';
import { CacheModule } from './shared/cache/cache.module';
import { EncryptionModule } from './shared/encryption/encryption.module';
import { MongodbModule } from './shared/mongodb/mongodb.module';
import { KafkaModule } from './shared/kafka/kafka.module';
import { StorageModule } from './shared/storage/storage.module';
import { SmsModule } from './shared/sms/sms.module';

import { AuthModule } from './modules/auth/auth.module';
import { KycModule } from './modules/kyc/kyc.module';
import { I18nAppModule } from './shared/i18n/i18n.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UserModule } from './modules/user/user.module';
import { CmsModule } from './modules/cms/cms.module';
import { DocumentModule } from './modules/document/document.module';
import { ConsentModule } from './modules/consent/consent.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { LoanModule } from './modules/loan/loan.module';
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
      load: [databaseConfig, jwtConfig, redisConfig, mongodbConfig, kafkaConfig, storageConfig, smsConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('BULL_REDIS_HOST'),
          port: config.get('BULL_REDIS_PORT'),
          password: config.get('BULL_REDIS_PASSWORD'),
          tls: config.get('BULL_REDIS_TLS') === 'true' ? {} : undefined,
        },
      }),
      inject: [ConfigService],
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
    MongodbModule,
    KafkaModule,
    StorageModule,
    SmsModule,

    // Feature modules
    AuthModule,
    KycModule,
    I18nAppModule,
    AuditModule,
    NotificationModule,
    UserModule,
    CmsModule,
    DocumentModule,
    ConsentModule,
    ScoringModule,
    LoanModule,
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
