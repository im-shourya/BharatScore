import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Kafka Module — Provides producer service for event streaming.
 *
 * Topics:
 *   raw-data-phone, raw-data-bank, raw-data-ecommerce, raw-data-geolocation,
 *   raw-data-merchant, feature-computation, score-requests, score-results,
 *   consent-events, loan-events, notification-events, audit-events,
 *   user-deletion-requests, repayment-webhooks, model-monitoring
 *
 * NOTE: Full @nestjs/microservices Kafka transport requires the package installed.
 * This module provides a lightweight producer using kafkajs directly.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
