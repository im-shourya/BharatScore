import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { DigiLockerService } from './digilocker.service';
import { KycRecordEntity } from './entities/kyc-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycRecordEntity]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [KycController],
  providers: [KycService, DigiLockerService],
  exports: [KycService], // exported so LoanModule can check KYC status
})
export class KycModule {}
