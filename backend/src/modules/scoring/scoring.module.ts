import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoringController } from './scoring.controller';
import { ScoringService } from './scoring.service';
import { ScoringRepository } from './scoring.repository';
import { CreditScoreEntity } from './entities/credit-score.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreditScoreEntity])],
  controllers: [ScoringController],
  providers: [ScoringService, ScoringRepository],
  exports: [ScoringService],
})
export class ScoringModule {}
