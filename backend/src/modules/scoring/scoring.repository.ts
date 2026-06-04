import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditScoreEntity } from './entities/credit-score.entity';
import { RiskBand } from '../../common/enums/risk-band.enum';

@Injectable()
export class ScoringRepository {
  constructor(
    @InjectRepository(CreditScoreEntity) private readonly scoreRepo: Repository<CreditScoreEntity>,
  ) {}

  async createOrUpdate(data: Partial<CreditScoreEntity>): Promise<CreditScoreEntity> {
    let score = await this.scoreRepo.findOne({ where: { user_id: data.user_id }, order: { generated_at: 'DESC' } });
    if (score) {
      score.score = data.score as number;
      score.data_completeness = data.data_completeness as any;
      score.risk_band = data.risk_band as RiskBand;
      score.generated_at = new Date();
    } else {
      score = this.scoreRepo.create(data);
    }
    return this.scoreRepo.save(score);
  }

  async findByUserId(userId: string): Promise<CreditScoreEntity | null> {
    return this.scoreRepo.findOne({ where: { user_id: userId }, order: { generated_at: 'DESC' } });
  }
}
