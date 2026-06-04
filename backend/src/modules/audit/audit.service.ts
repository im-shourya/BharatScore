import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuditRepository } from './audit.repository';
// import { KafkaProducerService } from '../../shared/kafka/kafka-producer.service';

export interface AuditLogParams {
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_hash?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    // private readonly kafkaProducer: KafkaProducerService, // Uncomment when Kafka is ready
  ) {}

  async log(params: AuditLogParams) {
    const lastLog = await this.auditRepository.findLatest(params.entity_type, params.entity_id);
    const prevHash = lastLog?.payload_hash ?? null;

    const chainPayload = JSON.stringify({ ...params, prevHash, ts: Date.now() });
    const currentHash = crypto.createHash('sha256').update(chainPayload).digest('hex');

    const log = await this.auditRepository.create({
      ...params,
      payload_hash: currentHash,
      prev_hash: prevHash ?? undefined,
    } as any);

    // await this.kafkaProducer.emit('audit-events', {
    //   ...log,
    //   emitted_at: new Date(),
    // });

    return log;
  }

  hashPayload(payload: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload ?? {}))
      .digest('hex');
  }

  async verifyChain(entityType: string, entityId: string): Promise<boolean> {
    const logs = await this.auditRepository.findAll(entityType, entityId);
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].prev_hash !== logs[i - 1].payload_hash) return false;
    }
    return true;
  }
}
