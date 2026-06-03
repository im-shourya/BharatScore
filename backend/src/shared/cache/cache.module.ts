import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    // Register Bull for background job processing using Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        redis: {
          host: config.get('BULL_REDIS_HOST') || config.get('redis.host') || 'localhost',
          port: config.get('BULL_REDIS_PORT') || config.get('redis.port') || 6379,
          password: config.get('BULL_REDIS_PASSWORD') || config.get('redis.password') || undefined,
          tls: config.get('BULL_REDIS_TLS') === 'true' ? {} : undefined,
        },
        defaultJobOptions: {
          attempts: config.get<number>('BULL_DEFAULT_JOB_ATTEMPTS', 3),
          backoff: {
            type: 'exponential',
            delay: config.get<number>('BULL_BACKOFF_DELAY_MS', 5000),
          },
          removeOnComplete: config.get<number>('BULL_REMOVE_ON_COMPLETE', 100),
          removeOnFail: config.get<number>('BULL_REMOVE_ON_FAIL', 200),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, BullModule],
})
export class CacheModule {}
