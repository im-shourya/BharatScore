import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanRepository } from './loan.repository';
// import { KycService } from '../kyc/kyc.service';
// import { ScoringService } from '../scoring/scoring.service';
// import { NotificationService } from '../notification/notification.service';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { LoanState } from '../../common/enums/loan-state.enum';
import { LoanPurpose } from '../../common/enums/loan-purpose.enum';

@Injectable()
export class LoanService {
  constructor(
    private readonly loanRepository: LoanRepository,
    // private readonly kycService: KycService,
    // private readonly scoringService: ScoringService,
    // private readonly notificationService: NotificationService,
  ) {}

  async apply(userId: string, dto: ApplyLoanDto) {
    // 1. Check KYC Status
    // const kyc = await this.kycService.getKycStatus(userId);
    // if (kyc.status !== 'fully_verified') {
    //   throw new BadRequestException('Complete KYC before applying for a loan');
    // }

    // 2. Ensure they have a score
    // const score = await this.scoringService.getScore(userId).catch(() => null);
    // if (!score) {
    //   await this.scoringService.calculateScore(userId); // Or queue it
    // }

    // 3. Create Loan Application
    const loan = await this.loanRepository.create({
      user_id: userId,
      purpose: LoanPurpose.OTHER, // Assume for now
      amount_requested: dto.amount_requested,
      tenure_months: dto.tenure_months,
      state: LoanState.DRAFT,
    });

    // 4. Notify User
    // await this.notificationService.queueNotification({
    //   notificationId: `loan-${loan.id}`,
    //   userId,
    //   eventType: 'LOAN_SUBMITTED',
    //   channel: 'sms',
    //   data: { amount: dto.amount_requested, tenure: dto.tenure_months },
    // });

    return loan;
  }

  async getUserLoans(userId: string) {
    return this.loanRepository.findByUserId(userId);
  }

  async getLoanDetails(userId: string, loanId: string) {
    const loan = await this.loanRepository.findByIdAndUserId(loanId, userId);
    if (!loan) throw new NotFoundException('Loan application not found');
    return loan;
  }
}
