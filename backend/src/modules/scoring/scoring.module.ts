import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { ScoringRepository } from './scoring.repository';
import { CreditScoreEntity } from './entities/credit-score.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditScoreEntity]),
    HttpModule.register({ timeout: 30000 }),
    NotificationModule,
  ],
  controllers: [ScoringController],
  providers: [ScoringService, ScoringRepository],
  exports: [ScoringService, ScoringRepository],
})
export class ScoringModule {}
