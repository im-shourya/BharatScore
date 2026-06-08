import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { Request } from 'express';

@ApiTags('consent')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all user consents' })
  async getConsents(@CurrentUser() user: JwtPayload) {
    return this.consentService.getUserConsents(user.sub);
  }

  @Post('grant')
  @ApiOperation({ summary: 'Grant consent for a specific scope/purpose' })
  async grantConsent(
    @CurrentUser() user: JwtPayload,
    @Body('scope') scope: string,
    @Body('purpose') purpose: string,
    @Req() req: Request,
  ) {
    return this.consentService.recordConsent(
      user.sub,
      scope,
      purpose,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  @Post('revoke')
  @ApiOperation({ summary: 'Revoke consent for a specific scope/purpose' })
  async revokeConsent(
    @CurrentUser() user: JwtPayload,
    @Body('scope') scope: string,
    @Body('purpose') purpose: string,
    @Req() req: Request,
  ) {
    return this.consentService.revokeConsent(
      user.sub,
      scope,
      purpose,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }
}
