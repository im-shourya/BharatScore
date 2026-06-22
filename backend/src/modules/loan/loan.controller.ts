import { Controller, Post, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { LoanDecisionDto } from './dto/loan-decision.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { Role } from '../../common/enums/role.enum';
import { LoanState } from '../../common/enums/loan-state.enum';

@ApiTags('loans')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // ═══════════════════════════════════════════════════════════
  // BORROWER ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Post('apply')
  @ApiOperation({ summary: 'Apply for a loan (borrower)' })
  async apply(@CurrentUser() user: JwtPayload, @Body() dto: ApplyLoanDto) {
    return this.loanService.apply(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user loan applications' })
  async getLoans(@CurrentUser() user: JwtPayload) {
    return this.loanService.getUserLoans(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan details with state history' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async getLoanDetails(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loanService.getLoanDetails(user.sub, id);
  }

  // ═══════════════════════════════════════════════════════════
  // LENDER / ADMIN ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  @Get('admin/pending')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all loans pending review (lender/admin)' })
  async getPendingReview() {
    return this.loanService.getPendingReview();
  }

  @Get('admin/by-state')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Get loans by state (lender/admin)' })
  @ApiQuery({ name: 'state', enum: LoanState })
  async getLoansByState(@Query('state') state: LoanState) {
    return this.loanService.getLoansByState(state);
  }

  @Get('admin/:id/history')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Get full state transition history (lender/admin)' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async getTransitionHistory(@Param('id') id: string) {
    return this.loanService.getTransitionHistory(id);
  }

  @Patch('admin/:id/review')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Submit loan for review — SUBMITTED → UNDER_REVIEW' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async submitForReview(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loanService.submitForReview(user.sub, id);
  }

  @Patch('admin/:id/decide')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a loan (lender/admin)' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async makeDecision(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: LoanDecisionDto,
  ) {
    return this.loanService.makeDecision(user.sub, id, dto);
  }

  @Patch('admin/:id/disburse')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Disburse approved loan — APPROVED → DISBURSED' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async disburse(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DisburseLoanDto,
  ) {
    return this.loanService.disburse(user.sub, id, dto);
  }

  @Patch('admin/:id/mark-repaying')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Mark loan as repaying — DISBURSED → REPAYING' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async markRepaying(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loanService.markRepaying(user.sub, id);
  }

  @Patch('admin/:id/close')
  @Roles(Role.LENDER, Role.ADMIN)
  @ApiOperation({ summary: 'Close fully repaid loan — REPAYING → CLOSED' })
  @ApiParam({ name: 'id', description: 'Loan application UUID' })
  async closeLoan(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loanService.closeLoan(user.sub, id);
  }
}
