import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('scoring')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user score' })
  async getScore(@CurrentUser() user: JwtPayload) {
    return this.scoringService.getScore(user.sub);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Trigger score calculation manually' })
  async calculateScore(@CurrentUser() user: JwtPayload) {
    return this.scoringService.calculateScore(user.sub);
  }
}
