import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(CacheService.name);
  private keyPrefix: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('redis.host') || 'localhost';
    const port = this.config.get<number>('redis.port') || 6379;
    const password = this.config.get<string>('redis.password') || undefined;
    this.keyPrefix = this.config.get<string>('redis.keyPrefix') || 'cs:';

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed after 3 retries. Running without cache.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}. Cache operations will be no-ops.`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    // Attempt connection but don't block startup
    this.client.connect().catch((err) => {
      this.logger.warn(`Redis initial connection failed: ${err.message}. Running without cache.`);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  async get<T = string>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;
    try {
      const value = await this.client.get(this.prefixKey(key));
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (err) {
      this.logger.warn(`Cache GET error for ${key}: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(this.prefixKey(key), serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(this.prefixKey(key), serialized);
      }
    } catch (err) {
      this.logger.warn(`Cache SET error for ${key}: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected()) return;
    try {
      await this.client.del(this.prefixKey(key));
    } catch (err) {
      this.logger.warn(`Cache DEL error for ${key}: ${err.message}`);
    }
  }

  async increment(key: string): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      return await this.client.incr(this.prefixKey(key));
    } catch (err) {
      this.logger.warn(`Cache INCR error for ${key}: ${err.message}`);
      return 0;
    }
  }

  async getTtl(key: string): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      return await this.client.ttl(this.prefixKey(key));
    } catch (err) {
      this.logger.warn(`Cache TTL error for ${key}: ${err.message}`);
      return 0;
    }
  }
}
