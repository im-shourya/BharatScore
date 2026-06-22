import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { LoanApplicationEntity } from './entities/loan-application.entity';
import { LoanStateTransitionEntity } from './entities/loan-state-transition.entity';
import { LoanState } from '../../common/enums/loan-state.enum';

@Injectable()
export class LoanRepository {
  constructor(
    @InjectRepository(LoanApplicationEntity)
    private readonly repository: Repository<LoanApplicationEntity>,
    @InjectRepository(LoanStateTransitionEntity)
    private readonly transitionRepository: Repository<LoanStateTransitionEntity>,
  ) {}

  async create(data: Partial<LoanApplicationEntity>): Promise<LoanApplicationEntity> {
    const loan = this.repository.create(data);
    return this.repository.save(loan);
  }

  async findById(id: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({ where: { id, user_id: userId } });
  }

  async findActiveByUser(userId: string): Promise<LoanApplicationEntity | null> {
    const activeStates = [
      LoanState.DRAFT,
      LoanState.SUBMITTED,
      LoanState.UNDER_REVIEW,
      LoanState.PENDING_SECOND_APPROVAL,
      LoanState.APPROVED,
      LoanState.DISBURSED,
      LoanState.REPAYING,
    ];
    return this.repository.findOne({
      where: { user_id: userId, state: In(activeStates) },
      order: { created_at: 'DESC' },
    });
  }

  async update(id: string, data: Partial<LoanApplicationEntity>): Promise<void> {
    await this.repository.update(id, data);
  }

  async updateStatus(id: string, state: LoanState): Promise<void> {
    await this.repository.update(id, { state });
  }

  // ── State Transitions ──────────────────────────────────────

  async recordTransition(data: Partial<LoanStateTransitionEntity>): Promise<LoanStateTransitionEntity> {
    const transition = this.transitionRepository.create(data);
    return this.transitionRepository.save(transition);
  }

  async getTransitionHistory(loanId: string): Promise<LoanStateTransitionEntity[]> {
    return this.transitionRepository.find({
      where: { loan_id: loanId },
      order: { transitioned_at: 'ASC' },
    });
  }

  // ── Admin Queries ──────────────────────────────────────────

  async findByState(state: LoanState): Promise<LoanApplicationEntity[]> {
    return this.repository.find({ where: { state }, order: { created_at: 'ASC' } });
  }

  }

  // ── Admin Analytics ────────────────────────────────────────

  async countByPeriod(from: string, to: string): Promise<number> {
    return this.repository
      .createQueryBuilder('loan')
      .where('loan.created_at BETWEEN :from AND :to', { from, to })
      .getCount();
  }

  async getApprovalRate(from: string, to: string): Promise<number> {
    const total = await this.countByPeriod(from, to);
    if (total === 0) return 0;

    const approvedCount = await this.repository
      .createQueryBuilder('loan')
      .where('loan.created_at BETWEEN :from AND :to', { from, to })
      .andWhere('loan.state IN (:...states)', { 
        states: [LoanState.APPROVED, LoanState.DISBURSED, LoanState.REPAYING, LoanState.CLOSED] 
      })
      .getCount();

    return approvedCount / total;
  }
}


