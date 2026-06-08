import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { ApplyLoanDto } from './dto/apply-loan.dto';

@ApiTags('loans')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply for a loan' })
  async apply(@CurrentUser() user: JwtPayload, @Body() dto: ApplyLoanDto) {
    return this.loanService.apply(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user loan applications' })
  async getLoans(@CurrentUser() user: JwtPayload) {
    return this.loanService.getUserLoans(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific loan application details' })
  async getLoanDetails(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.loanService.getLoanDetails(user.sub, id);
  }
}
