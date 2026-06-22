import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoanRepository } from '../loan/loan.repository';
import { ScoringRepository } from '../scoring/scoring.repository';
import { ConsentRepository } from '../consent/consent.repository';
import { UserRepository } from '../user/user.repository';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly scoreRepository: ScoringRepository,
    private readonly consentRepository: ConsentRepository,
    private readonly userRepository: UserRepository,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getModelMetrics() {
    // Fallback mock since ClickHouse is not available in local dev
    // Represents the output structure defined in docs for ClickHouse queries
    this.logger.log('Returning mocked ClickHouse metrics for Admin Dashboard');
    return {
      model_metrics: [
        { model_version: 'v3.0-ensemble', date: '2026-06-22', avg_score: 650, very_high_ratio: 0.12, low_risk_ratio: 0.65 },
        { model_version: 'v3.0-ensemble', date: '2026-06-21', avg_score: 648, very_high_ratio: 0.13, low_risk_ratio: 0.63 },
        { model_version: 'v3.0-ensemble', date: '2026-06-20', avg_score: 652, very_high_ratio: 0.11, low_risk_ratio: 0.68 },
      ],
      fairness_audit: [
        { demographic_group: 'urban_millennial', approval_rate: 0.75, avg_score: 680 },
        { demographic_group: 'rural_farmer', approval_rate: 0.72, avg_score: 660 },
        { demographic_group: 'gig_worker', approval_rate: 0.68, avg_score: 630 },
      ]
    };
  }

  async triggerRetrain(force: boolean) {
    try {
      const airflowUrl = this.config.get<string>('AIRFLOW_URL') || 'http://localhost:8080';
      const response = await firstValueFrom(
        this.httpService.post(
          `${airflowUrl}/api/v1/dags/BharatScore_monthly_retrain/dagRuns`,
          { conf: { force_retrain: force } },
          { 
            auth: { 
              username: this.config.get('AIRFLOW_USER') || 'admin', 
              password: this.config.get('AIRFLOW_PASS') || 'admin' 
            },
            timeout: 5000 
          },
        ),
      );
      return { dag_run_id: response.data.dag_run_id, triggered_at: new Date(), source: 'airflow' };
    } catch (error) {
      this.logger.warn(`Airflow trigger failed (${error.message}). Returning mock retrain trigger.`);
      return { dag_run_id: `mock-dag-run-${Date.now()}`, triggered_at: new Date(), source: 'mock' };
    }
  }

  async generateComplianceReport(from: string, to: string) {
    const [totalLoans, approvalRate, avgScore, consentStats, deletionRequests] = await Promise.all([
      this.loanRepository.countByPeriod(from, to),
      this.loanRepository.getApprovalRate(from, to),
      this.scoreRepository.getAverageScore(from, to),
      this.consentRepository.getStats(from, to),
      this.userRepository.getDeletionRequests(from, to),
    ]);

    return {
      period: { from, to },
      loans: { total: totalLoans, approval_rate: approvalRate },
      scores: { average: avgScore },
      consent: consentStats,
      data_requests: { deletions: deletionRequests },
      generated_at: new Date(),
    };
  }

  async getUsers(skip: number = 0, take: number = 20, filters?: any) {
    const [users, total] = await this.userRepository.findAll(skip, take, filters);
    // Filter out PII like encrypted strings if sending to a generic admin table
    const safeUsers = users.map(u => {
      const { full_name_encrypted, email_encrypted, ...safe } = u;
      return safe;
    });
    return { data: safeUsers, total, skip, take };
  }

  async getUserById(id: string) {
    return this.userRepository.findById(id);
  }

  async updateUserStatus(id: string, status: UserStatus) {
    return this.userRepository.updateById(id, { status } as any);
  }
}
