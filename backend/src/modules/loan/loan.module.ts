import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';
import { LoanApplicationEntity } from './entities/loan-application.entity';
import { LoanStateTransitionEntity } from './entities/loan-state-transition.entity';
import { KycModule } from '../kyc/kyc.module';
import { ScoringModule } from '../scoring/scoring.module';
import { NotificationModule } from '../notification/notification.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplicationEntity, LoanStateTransitionEntity]),
    KycModule,
    ScoringModule,
    NotificationModule,
    AuditModule,
  ],
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
  exports: [LoanService, LoanRepository],
})
export class LoanModule {}
