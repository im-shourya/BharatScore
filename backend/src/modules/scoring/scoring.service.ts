import { Injectable, NotFoundException } from '@nestjs/common';
import { ScoringRepository } from './scoring.repository';
// import { KafkaProducerService } from '../../shared/kafka/kafka-producer.service';
// import { NotificationService } from '../notification/notification.service';
import { RiskBand } from '../../common/enums/risk-band.enum';

@Injectable()
export class ScoringService {
  constructor(
    private readonly scoringRepository: ScoringRepository,
    // private readonly kafkaProducer: KafkaProducerService,
    // private readonly notificationService: NotificationService,
  ) {}

  async calculateScore(userId: string) {
    // In reality, this would trigger an ML pipeline or Kafka event.
    // For now, we mock the result.
    const mockScore = Math.floor(Math.random() * (850 - 300 + 1)) + 300;
    
    let riskBand = RiskBand.HIGH;
    if (mockScore > 750) riskBand = RiskBand.LOW;
    else if (mockScore > 600) riskBand = RiskBand.MEDIUM;

    const score = await this.scoringRepository.createOrUpdate({
      user_id: userId,
      score: mockScore,
      data_completeness: {
        financial: true,
        behavioral: true,
        demographic: true,
      },
      risk_band: riskBand,
      model1_pd: 0.1,
      model2_risk: 0.1,
      model3_stability: 0.1,
      ensemble_pd: 0.1,
      feature_version: 'v1.0',
      model_version: 'v1.0',
    });

    // Notify user
    // await this.notificationService.queueNotification({
    //   notificationId: `score-${Date.now()}`,
    //   userId,
    //   eventType: 'SCORE_GENERATED',
    //   channel: 'sms',
    //   data: { score: mockScore },
    // });

    return score;
  }

  async getScore(userId: string) {
    const score = await this.scoringRepository.findByUserId(userId);
    if (!score) throw new NotFoundException('Score not found for this user');
    return score;
  }
}
