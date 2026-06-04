import {
  Controller, Post, Get, Query,
  UseGuards, Res,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Public } from '../../decorators/public.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  // ── POST /api/v1/kyc/initiate ─────────────────────────────
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Start DigiLocker KYC — returns auth_url to redirect user' })
  @ApiResponse({
    status: 200,
    description: 'Returns DigiLocker redirect URL',
    schema: {
      example: {
        success: true,
        data: {
          kyc_session_id: 'uuid-here',
          auth_url: 'https://digilocker.meripehchaan.gov.in/...',
          valid_upto: '2024-01-15T10:45:00+05:30',
          message: 'Redirect user to auth_url to complete DigiLocker KYC',
        },
      },
    },
  })
  async initiateKyc(@CurrentUser() user: JwtPayload) {
    return this.kycService.initiateKyc(user.sub);
  }

  // ── GET /api/v1/kyc/callback ──────────────────────────────
  // This is where DigiLocker redirects after user consent
  // Must be PUBLIC (no JWT required)
  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'DigiLocker OAuth callback — DO NOT call manually' })
  @ApiQuery({ name: 'success', required: true })
  @ApiQuery({ name: 'id', required: true, description: 'Setu session ID' })
  @ApiQuery({ name: 'scope', required: false })
  @ApiQuery({ name: 'kycSessionId', required: true, description: 'Our internal session ID' })
  @ApiQuery({ name: 'errCode', required: false })
  @ApiQuery({ name: 'errMessage', required: false })
  async handleCallback(
    @Query('success') success: string,
    @Query('id') setuId: string,
    @Query('scope') scope: string = '',
    @Query('kycSessionId') kycSessionId: string,
    @Query('errCode') errCode: string,
    @Query('errMessage') errMessage: string,
    @Res() res: Response,
  ) {
    const result = await this.kycService.handleCallback({
      success,
      id: setuId,
      scope,
      kycSessionId,
      errCode,
      errMessage,
    });

    // Redirect user to frontend (mobile deeplink or web page)
    return res.redirect(result.redirect_to);
  }

  // ── GET /api/v1/kyc/status ────────────────────────────────
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current KYC verification status' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          status: 'aadhaar_verified',
          verified_at: '2024-01-15T10:30:00.000Z',
          fields_verified: ['aadhaar', 'name', 'dob', 'gender', 'address'],
        },
      },
    },
  })
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.kycService.getKycStatus(user.sub);
  }

  @Get('test-setu')
  @ApiOperation({ summary: 'Diagnostic endpoint to test Setu API connectivity' })
  async testSetu() {
    return this.kycService.testSetuConnection();
  }
}
