import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Kafka topic constants matching the spec's topic design (Section 15).
 */
export const KAFKA_TOPICS = {
  RAW_DATA_PHONE: 'raw-data-phone',
  RAW_DATA_BANK: 'raw-data-bank',
  RAW_DATA_ECOMMERCE: 'raw-data-ecommerce',
  RAW_DATA_GEOLOCATION: 'raw-data-geolocation',
  RAW_DATA_MERCHANT: 'raw-data-merchant',
  FEATURE_COMPUTATION: 'feature-computation',
  SCORE_REQUESTS: 'score-requests',
  SCORE_RESULTS: 'score-results',
  CONSENT_EVENTS: 'consent-events',
  LOAN_EVENTS: 'loan-events',
  NOTIFICATION_EVENTS: 'notification-events',
  AUDIT_EVENTS: 'audit-events',
  USER_DELETION_REQUESTS: 'user-deletion-requests',
  REPAYMENT_WEBHOOKS: 'repayment-webhooks',
  MODEL_MONITORING: 'model-monitoring',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export interface KafkaMessage {
  key?: string;
  value: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * KafkaProducerService — Wraps kafkajs for producing events.
 *
 * Usage:
 *   await this.kafkaProducer.emit(KAFKA_TOPICS.AUDIT_EVENTS, {
 *     key: entityId,
 *     value: { actor_id, entity_type, action, ... },
 *   });
 *
 * NOTE: Requires `kafkajs` package. If not installed, this service
 * logs messages instead of producing them (graceful degradation).
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: any = null;
  private kafka: any = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      // Dynamic import — fails gracefully if kafkajs not installed
      const { Kafka } = await import('kafkajs');

      this.kafka = new Kafka({
        clientId: this.config.get<string>('kafka.clientId', 'credsaathi-api'),
        brokers: this.config.get<string[]>('kafka.brokers', ['localhost:9092']),
        ssl: this.config.get<boolean>('kafka.ssl', false),
        sasl: this.config.get('kafka.sasl.username') ? {
          mechanism: this.config.get<string>('kafka.sasl.mechanism', 'plain').toLowerCase(),
          username: this.config.get<string>('kafka.sasl.username')!,
          password: this.config.get<string>('kafka.sasl.password')!,
        } as any : undefined,
        connectionTimeout: this.config.get<number>('kafka.connectionTimeout', 3000),
        requestTimeout: this.config.get<number>('kafka.requestTimeout', 25000),
        retry: {
          retries: this.config.get<number>('kafka.retry.retries', 5),
          initialRetryTime: this.config.get<number>('kafka.retry.initialRetryTime', 300),
          multiplier: this.config.get<number>('kafka.retry.multiplier', 2),
        },
      });

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: false,
        idempotent: true,
        transactionTimeout: 30000,
      });

      await this.producer.connect();
      this.connected = true;
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.warn(`Kafka producer not available: ${(err as Error).message}. Events will be logged only.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer && this.connected) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Emit a message to a Kafka topic.
   * Falls back to logging if Kafka is not connected.
   */
  async emit(topic: KafkaTopic, message: KafkaMessage): Promise<void> {
    const payload = {
      topic,
      messages: [
        {
          key: message.key || undefined,
          value: JSON.stringify({
            ...message.value,
            emitted_at: new Date().toISOString(),
          }),
          headers: message.headers,
        },
      ],
    };

    if (this.connected && this.producer) {
      try {
        await this.producer.send(payload);
      } catch (err) {
        this.logger.error(`Failed to emit to ${topic}: ${(err as Error).message}`);
      }
    } else {
      this.logger.debug(`[KAFKA-MOCK] ${topic}: ${JSON.stringify(message.value).substring(0, 200)}`);
    }
  }

  /**
   * Emit multiple messages in a batch.
   */
  async emitBatch(
    topic: KafkaTopic,
    messages: KafkaMessage[],
  ): Promise<void> {
    if (this.connected && this.producer) {
      await this.producer.send({
        topic,
        messages: messages.map((m) => ({
          key: m.key,
          value: JSON.stringify({ ...m.value, emitted_at: new Date().toISOString() }),
          headers: m.headers,
        })),
      });
    } else {
      this.logger.debug(`[KAFKA-MOCK] Batch of ${messages.length} to ${topic}`);
    }
  }
}
