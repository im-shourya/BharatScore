import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LoanRepository } from './loan.repository';
import { LoanApplicationEntity } from './entities/loan-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplicationEntity])],
  controllers: [LoanController],
  providers: [LoanService, LoanRepository],
  exports: [LoanService],
})
export class LoanModule {}
