import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repository: Repository<AuditLogEntity>,
  ) {}

  async create(data: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const log = this.repository.create(data);
    return this.repository.save(log);
  }

  async findLatest(entityType: string, entityId: string): Promise<AuditLogEntity | null> {
    return this.repository.findOne({
      where: { entity_type: entityType, entity_id: entityId },
      order: { logged_at: 'DESC' },
    });
  }

  async findAll(entityType: string, entityId: string): Promise<AuditLogEntity[]> {
    return this.repository.find({
      where: { entity_type: entityType, entity_id: entityId },
      order: { logged_at: 'ASC' },
    });
  }
}
