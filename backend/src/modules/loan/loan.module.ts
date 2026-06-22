import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';
import { LoanApplicationEntity } from './entities/loan-application.entity';
import { KycModule } from '../kyc/kyc.module';
import { ScoringModule } from '../scoring/scoring.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplicationEntity]),
    KycModule,
    ScoringModule,
    NotificationModule,
  ],
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
  exports: [LoanService],
})
export class LoanModule {}

