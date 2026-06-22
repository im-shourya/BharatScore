import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module';
import { LoanModule } from '../loan/loan.module';
import { ScoringModule } from '../scoring/scoring.module';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [
    HttpModule,
    UserModule,
    LoanModule,
    ScoringModule,
    ConsentModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
