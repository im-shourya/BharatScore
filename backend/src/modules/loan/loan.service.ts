import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { LoanRepository } from './loan.repository';
import { KycService } from '../kyc/kyc.service';
import { ScoringService } from '../scoring/scoring.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { LoanDecisionDto } from './dto/loan-decision.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { LoanState } from '../../common/enums/loan-state.enum';
import { LoanPurpose } from '../../common/enums/loan-purpose.enum';
import { KycStatus } from '../../common/enums/kyc-status.enum';

// ── Valid State Transitions (from docs Section 15) ──────────
const VALID_TRANSITIONS: Record<LoanState, LoanState[]> = {
  [LoanState.DRAFT]:                   [LoanState.SUBMITTED],
  [LoanState.SUBMITTED]:               [LoanState.UNDER_REVIEW, LoanState.REJECTED],
  [LoanState.UNDER_REVIEW]:            [LoanState.APPROVED, LoanState.REJECTED, LoanState.PENDING_SECOND_APPROVAL],
  [LoanState.PENDING_SECOND_APPROVAL]: [LoanState.APPROVED, LoanState.REJECTED],
  [LoanState.APPROVED]:                [LoanState.DISBURSED, LoanState.REJECTED],
  [LoanState.REJECTED]:                [],
  [LoanState.DISBURSED]:               [LoanState.REPAYING],
  [LoanState.REPAYING]:                [LoanState.CLOSED, LoanState.DEFAULTED],
  [LoanState.CLOSED]:                  [],
  [LoanState.DEFAULTED]:               [LoanState.WRITTEN_OFF],
  [LoanState.WRITTEN_OFF]:             [],
};

/** Amount threshold for dual-approval requirement (₹2,00,000) */
const DUAL_APPROVAL_THRESHOLD = 200000;

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly kycService: KycService,
    private readonly scoringService: ScoringService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // BORROWER ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Apply for a loan — creates application and transitions DRAFT → SUBMITTED.
   */
  async apply(userId: string, dto: ApplyLoanDto) {
    // 1. Check KYC Status — must be at least Aadhaar-verified
    const kyc = await this.kycService.getKycStatus(userId);
    if (kyc.status === KycStatus.PENDING) {
      throw new BadRequestException({
        code: 'KYC_REQUIRED',
        message: 'Complete KYC verification before applying for a loan.',
        kyc_status: kyc.status,
      });
    }

    // 2. Check for existing active loan
    const activeLoan = await this.loanRepository.findActiveByUser(userId);
    if (activeLoan) {
      throw new ConflictException({
        code: 'ACTIVE_LOAN_EXISTS',
        message: 'You already have an active loan application.',
        existing_loan_id: activeLoan.id,
        existing_state: activeLoan.state,
      });
    }

    // 3. Ensure they have a credit score — trigger ML scoring if not
    let score = await this.scoringService.getScore(userId).catch(() => null);
    if (!score) {
      this.logger.log(`No score found for user ${userId}, triggering ML scoring...`);
      score = await this.scoringService.calculateScore(userId);
    }

    // 4. Create Loan Application (SUBMITTED state)
    const loan = await this.loanRepository.create({
      user_id: userId,
      score_id: score?.id ?? null,
      purpose: LoanPurpose.OTHER,
      amount_requested: dto.amount_requested,
      tenure_months: dto.tenure_months,
      state: LoanState.SUBMITTED,
      applied_at: new Date(),
    });

    // 5. Record state transition: DRAFT → SUBMITTED
    await this.loanRepository.recordTransition({
      loan_id: loan.id,
      actor_id: userId,
      from_state: LoanState.DRAFT,
      to_state: LoanState.SUBMITTED,
      reason: 'Loan application submitted by borrower',
    });

    // 6. Audit log
    await this.auditService.log({
      actor_id: userId,
      entity_type: 'loan_application',
      entity_id: loan.id,
      action: 'LOAN_SUBMITTED',
      new_value: { amount: dto.amount_requested, tenure: dto.tenure_months },
    }).catch(() => {});

    // 7. Notify user
    await this.notificationService.queueNotification({
      notificationId: `loan-${loan.id}`,
      userId,
      eventType: 'LOAN_SUBMITTED',
      channel: 'sms',
      data: { amount: dto.amount_requested, tenure: dto.tenure_months },
    }).catch(err => this.logger.warn(`Loan notification failed: ${err.message}`));

    return {
      loan_id: loan.id,
      state: loan.state,
      applied_at: loan.applied_at,
      amount_requested: loan.amount_requested,
      tenure_months: loan.tenure_months,
    };
  }

  async getUserLoans(userId: string) {
    return this.loanRepository.findByUserId(userId);
  }

  async getLoanDetails(userId: string, loanId: string) {
    const loan = await this.loanRepository.findByIdAndUserId(loanId, userId);
    if (!loan) throw new NotFoundException('Loan application not found');

    const transitions = await this.loanRepository.getTransitionHistory(loanId);
    return { ...loan, state_history: transitions };
  }

  // ═══════════════════════════════════════════════════════════
  // LENDER / ADMIN ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Submit loan for review — transitions SUBMITTED → UNDER_REVIEW.
   */
  async submitForReview(actorId: string, loanId: string) {
    const loan = await this.findLoanOrFail(loanId);
    await this.transition(loan, LoanState.UNDER_REVIEW, actorId, 'Submitted for underwriting review');
    return { loan_id: loanId, state: LoanState.UNDER_REVIEW };
  }

  /**
   * Approve or reject a loan — handles dual-approval for amounts > ₹2L.
   */
  async makeDecision(actorId: string, loanId: string, dto: LoanDecisionDto) {
    const loan = await this.findLoanOrFail(loanId);

    const allowedStates = [LoanState.UNDER_REVIEW, LoanState.PENDING_SECOND_APPROVAL];
    if (!allowedStates.includes(loan.state)) {
      throw new BadRequestException({
        code: 'INVALID_LOAN_STATE',
        message: `Cannot make decision on loan in state: ${loan.state}`,
        current_state: loan.state,
      });
    }

    // Dual approval: large amounts require second approver
    const isLargeAmount = loan.amount_requested > DUAL_APPROVAL_THRESHOLD;
    if (
      dto.decision === 'approved' &&
      isLargeAmount &&
      loan.state !== LoanState.PENDING_SECOND_APPROVAL
    ) {
      await this.loanRepository.update(loanId, {
        state: LoanState.PENDING_SECOND_APPROVAL,
        lender_id: actorId,
        interest_rate: dto.interest_rate,
      } as any);

      await this.loanRepository.recordTransition({
        loan_id: loanId,
        actor_id: actorId,
        from_state: loan.state,
        to_state: LoanState.PENDING_SECOND_APPROVAL,
        reason: `Amount ₹${loan.amount_requested.toLocaleString('en-IN')} exceeds ₹2,00,000 — second approval required`,
      });

      this.logger.log(`Loan ${loanId}: routed to second approval (₹${loan.amount_requested})`);
      return {
        loan_id: loanId,
        state: LoanState.PENDING_SECOND_APPROVAL,
        message: 'Amount exceeds threshold — second approval required',
      };
    }

    // Final decision
    const newState = dto.decision === 'approved' ? LoanState.APPROVED : LoanState.REJECTED;

    const updateData: any = {
      state: newState,
      decided_at: new Date(),
    };
    if (dto.interest_rate !== undefined) updateData.interest_rate = dto.interest_rate;
    if (dto.amount_approved !== undefined) updateData.amount_approved = dto.amount_approved;
    if (dto.reason) {
      if (newState === LoanState.REJECTED) {
        updateData.rejection_reason = dto.reason;
        updateData.rejection_code = 'MANUAL_REJECTION';
      }
    }
    if (newState === LoanState.APPROVED && loan.state === LoanState.PENDING_SECOND_APPROVAL) {
      updateData.second_approver_id = actorId;
    } else {
      updateData.lender_id = actorId;
    }

    await this.loanRepository.update(loanId, updateData);

    await this.loanRepository.recordTransition({
      loan_id: loanId,
      actor_id: actorId,
      from_state: loan.state,
      to_state: newState,
      reason: dto.reason ?? (newState === LoanState.APPROVED ? 'Approved' : 'Rejected'),
    });

    // Audit
    await this.auditService.log({
      actor_id: actorId,
      entity_type: 'loan_application',
      entity_id: loanId,
      action: newState === LoanState.APPROVED ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
      old_value: { state: loan.state },
      new_value: { state: newState, reason: dto.reason },
    }).catch(() => {});

    // Notify borrower
    await this.notificationService.queueNotification({
      notificationId: `loan-decision-${loanId}`,
      userId: loan.user_id,
      eventType: newState === LoanState.APPROVED ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
      channel: 'sms',
      data: { loanId, amount: loan.amount_requested, decision: dto.decision },
    }).catch(err => this.logger.warn(`Decision notification failed: ${err.message}`));

    this.logger.log(`Loan ${loanId}: ${dto.decision} by ${actorId}`);
    return { loan_id: loanId, state: newState, decided_at: updateData.decided_at };
  }

  /**
   * Disburse an approved loan — transitions APPROVED → DISBURSED.
   */
  async disburse(actorId: string, loanId: string, dto: DisburseLoanDto) {
    const loan = await this.findLoanOrFail(loanId);

    if (loan.state !== LoanState.APPROVED) {
      throw new BadRequestException({
        code: 'LOAN_NOT_APPROVED',
        message: `Cannot disburse loan in state: ${loan.state}. Must be approved first.`,
      });
    }

    await this.loanRepository.update(loanId, {
      state: LoanState.DISBURSED,
      disbursed_at: new Date(),
      disbursement_account: dto.disbursement_account,
      disbursement_utr: dto.utr_number ?? null,
    } as any);

    await this.loanRepository.recordTransition({
      loan_id: loanId,
      actor_id: actorId,
      from_state: LoanState.APPROVED,
      to_state: LoanState.DISBURSED,
      reason: `Disbursed to ${dto.disbursement_account}`,
      metadata: { utr: dto.utr_number },
    });

    // Audit
    await this.auditService.log({
      actor_id: actorId,
      entity_type: 'loan_application',
      entity_id: loanId,
      action: 'LOAN_DISBURSED',
      new_value: { disbursement_account: dto.disbursement_account, utr: dto.utr_number },
    }).catch(() => {});

    // Notify borrower
    await this.notificationService.queueNotification({
      notificationId: `loan-disbursed-${loanId}`,
      userId: loan.user_id,
      eventType: 'LOAN_DISBURSED',
      channel: 'sms',
      data: { loanId, amount: loan.amount_approved ?? loan.amount_requested },
    }).catch(err => this.logger.warn(`Disbursement notification failed: ${err.message}`));

    this.logger.log(`Loan ${loanId}: disbursed by ${actorId}`);

    return {
      loan_id: loanId,
      state: LoanState.DISBURSED,
      disbursed_at: new Date(),
      utr: dto.utr_number,
    };
  }

  /**
   * Mark a disbursed loan as REPAYING (after first EMI confirmation).
   */
  async markRepaying(actorId: string, loanId: string) {
    const loan = await this.findLoanOrFail(loanId);
    await this.transition(loan, LoanState.REPAYING, actorId, 'First EMI cycle started');
    return { loan_id: loanId, state: LoanState.REPAYING };
  }

  /**
   * Close a fully repaid loan — transitions REPAYING → CLOSED.
   */
  async closeLoan(actorId: string, loanId: string) {
    const loan = await this.findLoanOrFail(loanId);
    await this.transition(loan, LoanState.CLOSED, actorId, 'All EMIs paid — loan closed');

    await this.loanRepository.update(loanId, { closed_at: new Date() } as any);

    await this.notificationService.queueNotification({
      notificationId: `loan-closed-${loanId}`,
      userId: loan.user_id,
      eventType: 'LOAN_CLOSED',
      channel: 'sms',
      data: { loanId },
    }).catch(() => {});

    return { loan_id: loanId, state: LoanState.CLOSED };
  }

  /**
   * Trigger default — transitions REPAYING → DEFAULTED.
   */
  async triggerDefault(loanId: string, reason: string) {
    const loan = await this.findLoanOrFail(loanId);
    await this.transition(loan, LoanState.DEFAULTED, 'system', reason);

    await this.loanRepository.update(loanId, { dpd_90_triggered_at: new Date() } as any);

    this.logger.warn(`Loan ${loanId}: DEFAULTED — ${reason}`);
    return { loan_id: loanId, state: LoanState.DEFAULTED };
  }

  // ── Admin query endpoints ──────────────────────────────────

  async getPendingReview() {
    return this.loanRepository.findPendingReview();
  }

  async getLoansByState(state: LoanState) {
    return this.loanRepository.findByState(state);
  }

  async getTransitionHistory(loanId: string) {
    return this.loanRepository.getTransitionHistory(loanId);
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private async findLoanOrFail(loanId: string) {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) throw new NotFoundException({ code: 'LOAN_NOT_FOUND', message: `Loan ${loanId} not found` });
    return loan;
  }

  /**
   * Generic state transition with validation + audit trail.
   */
  private async transition(
    loan: { id: string; state: LoanState; user_id: string },
    toState: LoanState,
    actorId: string,
    reason: string,
  ) {
    const allowed = VALID_TRANSITIONS[loan.state] ?? [];
    if (!allowed.includes(toState)) {
      throw new BadRequestException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition from ${loan.state} → ${toState}`,
        current_state: loan.state,
        allowed_transitions: allowed,
      });
    }

    await this.loanRepository.updateStatus(loan.id, toState);

    await this.loanRepository.recordTransition({
      loan_id: loan.id,
      actor_id: actorId,
      from_state: loan.state,
      to_state: toState,
      reason,
    });

    this.logger.log(`Loan ${loan.id}: ${loan.state} → ${toState} (by ${actorId})`);
  }
}
