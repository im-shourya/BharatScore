import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ScoringRepository } from './scoring.repository';
import { NotificationService } from '../notification/notification.service';
import { RiskBand } from '../../common/enums/risk-band.enum';

/** Shape returned by the ML FastAPI POST /score/survey */
interface MlScoreResponse {
  repayment_probability: number;
  default_probability: number;
  bharat_score: number;
  risk_band: string;
  model_probabilities: {
    M1_behavioral: number;
    M2_psychometric: number;
    M3_liquidity: number;
  };
  explainability_report: {
    narrative: string;
    positive_signals: string[];
    negative_signals: string[];
    improvement_tips: string[];
  };
  data_source?: Record<string, any>;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly mlUrl: string;

  constructor(
    private readonly scoringRepository: ScoringRepository,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
  ) {
    this.mlUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  /**
   * Triggers real ML scoring via the FastAPI /score/survey endpoint.
   * The ML service simulates passive signals from the mobile seed and
   * combines them with user-provided survey / KYC data.
   */
  async calculateScore(userId: string, surveyData?: {
    mobile?: string;
    employment_type?: string;
    education?: string;
    financial_discipline_score?: number;
    repayment_ethics_score?: number;
    future_orientation_score?: number;
    impulsiveness_score?: number;
    financial_literacy_score?: number;
  }) {
    try {
      // Build the payload for the ML API
      const payload = {
        mobile: surveyData?.mobile || userId.replace(/-/g, '').slice(0, 10),
        employment_type: surveyData?.employment_type || 'gig_platform',
        education: surveyData?.education || 'graduate',
        financial_discipline_score: surveyData?.financial_discipline_score ?? 3.5,
        repayment_ethics_score: surveyData?.repayment_ethics_score ?? 3.5,
        future_orientation_score: surveyData?.future_orientation_score ?? 3.5,
        impulsiveness_score: surveyData?.impulsiveness_score ?? 2.5,
        financial_literacy_score: surveyData?.financial_literacy_score ?? 3.0,
      };

      this.logger.log(`Requesting ML score for user: ${userId} → ${this.mlUrl}/score/survey`);

      const response = await firstValueFrom(
        this.httpService.post<MlScoreResponse>(
          `${this.mlUrl}/score/survey`,
          payload,
          { timeout: 30000 },
        ),
      );

      const ml = response.data;
      this.logger.log(`ML score received: ${ml.bharat_score} (${ml.risk_band}) for user: ${userId}`);

      // Map ML risk_band string to our RiskBand enum
      const riskBand = this.mapRiskBand(ml.risk_band);

      const score = await this.scoringRepository.createOrUpdate({
        user_id: userId,
        score: ml.bharat_score,
        risk_band: riskBand,
        model1_pd: ml.model_probabilities.M1_behavioral,
        model2_risk: ml.model_probabilities.M2_psychometric,
        model3_stability: ml.model_probabilities.M3_liquidity,
        ensemble_pd: ml.repayment_probability,
        data_completeness: {
          financial: true,
          behavioral: true,
          demographic: true,
          ml_source: ml.data_source ?? 'live',
        },
        features_snapshot: {
          explainability_report: ml.explainability_report,
          default_probability: ml.default_probability,
        },
        feature_version: 'v3.0',
        model_version: 'v3.0-ensemble',
      });

      // Notify user that score is ready
      await this.notificationService.queueNotification({
        notificationId: `score-${score.id}`,
        userId,
        eventType: 'SCORE_GENERATED',
        channel: 'sms',
        data: { score: ml.bharat_score, risk_band: ml.risk_band },
      }).catch(err => this.logger.warn(`Notification failed: ${err.message}`));

      return {
        ...score,
        explainability_report: ml.explainability_report,
      };

    } catch (error) {
      this.logger.error(`ML scoring failed for user ${userId}: ${error.message}. Falling back to mock.`);
      return this.calculateScoreFallback(userId);
    }
  }

  /**
   * Fallback: mock scoring if ML service is unreachable.
   * Ensures the backend still works during local dev without ML running.
   */
  private async calculateScoreFallback(userId: string) {
    const mockScore = Math.floor(Math.random() * (850 - 300 + 1)) + 300;

    let riskBand = RiskBand.HIGH;
    if (mockScore > 750) riskBand = RiskBand.LOW;
    else if (mockScore > 600) riskBand = RiskBand.MEDIUM;

    const score = await this.scoringRepository.createOrUpdate({
      user_id: userId,
      score: mockScore,
      data_completeness: { financial: false, behavioral: false, demographic: false, ml_source: 'fallback_mock' },
      risk_band: riskBand,
      model1_pd: 0,
      model2_risk: 0,
      model3_stability: 0,
      ensemble_pd: 0,
      feature_version: 'v0-mock',
      model_version: 'v0-mock',
    });

    return score;
  }

  private mapRiskBand(mlBand: string): RiskBand {
    const normalized = mlBand.toLowerCase().replace(/[^a-z]/g, '');
    if (normalized.includes('low') || normalized.includes('excellent') || normalized.includes('good')) return RiskBand.LOW;
    if (normalized.includes('medium') || normalized.includes('fair')) return RiskBand.MEDIUM;
    return RiskBand.HIGH;
  }

  async getScore(userId: string) {
    const score = await this.scoringRepository.findByUserId(userId);
    if (!score) throw new NotFoundException('Score not found for this user');
    return score;
  }
}

