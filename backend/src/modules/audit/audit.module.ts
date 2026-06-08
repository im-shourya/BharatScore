import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditLogEntity } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
