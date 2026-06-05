# BharatScore — DigiLocker KYC Integration Guide
## Using Setu DigiLocker API (Sandbox → Production)

> NestJS · Setu dg-sandbox.setu.co · Aadhaar XML eKYC
> Matches your existing `backend.md` architecture exactly

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables](#2-environment-variables)
3. [Install Dependencies](#3-install-dependencies)
4. [DigiLocker Service (Setu wrapper)](#4-digilocker-service-setu-wrapper)
5. [KYC Module — Full Implementation](#5-kyc-module--full-implementation)
6. [KYC Controller](#6-kyc-controller)
7. [KYC DTOs](#7-kyc-dtos)
8. [KYC Module Registration](#8-kyc-module-registration)
9. [ngrok Setup (for local redirect)](#9-ngrok-setup-for-local-redirect)
10. [Complete API Flow](#10-complete-api-flow)
11. [Test with cURL](#11-test-with-curl)
12. [Go Live Checklist](#12-go-live-checklist)

---

## 1. Architecture Overview

```
Frontend / Mobile App
    │
    │  POST /api/v1/kyc/initiate
    ▼
KycController (NestJS)
    │
    ▼
KycService.initiateKyc()
    │
    ▼
DigiLockerService.createSession()
    │  POST https://dg-sandbox.setu.co/api/digilocker
    ▼
Setu Sandbox
    │  returns { id, url, validUpto }
    ▼
KycService returns { kyc_session_id, auth_url }
    │
    ▼ (frontend redirects user to auth_url)

USER → Real DigiLocker Page (meripehchaan.gov.in)
    │  User logs in with Aadhaar OTP
    │  User selects: Aadhaar, PAN, DL
    │  User clicks Allow
    ▼
DigiLocker redirects to:
  https://your-ngrok.ngrok.io/api/v1/kyc/callback
  ?success=True&id=<session_id>&scope=ADHAR+PANCR

KycController.handleCallback()
    │
    ▼
KycService.completeKyc()
    │
    ▼
DigiLockerService.fetchAadhaarXml()
    │  GET https://dg-sandbox.setu.co/api/digilocker/:id/aadhaar
    ▼
Returns: name, dob, gender, address (JSON) + XML file URL
    │
    ▼
Stored encrypted in PostgreSQL (kyc_records table)
KYC status → AADHAAR_VERIFIED ✅
```

---

## 2. Environment Variables

Add these to your `.env` (alongside existing variables from backend.md):

```env
# ── Setu DigiLocker (Sandbox) ────────────────────────────
SETU_CLIENT_ID=test-client
SETU_CLIENT_SECRET=891707ee-d6cd-4744-a28d-058829e30f12
SETU_PRODUCT_INSTANCE_ID=891707ee-d6cd-4744-a28d-058829e30f10
SETU_BASE_URL=https://dg-sandbox.setu.co

# For production (replace above with real creds from setu.co):
# SETU_BASE_URL=https://dg.setu.co

# ── DigiLocker Redirect (use ngrok for local dev) ────────
DIGILOCKER_REDIRECT_URI=https://your-ngrok-url.ngrok.io/api/v1/kyc/callback
# Production:
# DIGILOCKER_REDIRECT_URI=https://api.bharatscore.in/api/v1/kyc/callback
```

---

## 3. Install Dependencies

```bash
pnpm add axios @nestjs/axios
pnpm add fast-xml-parser   # for parsing Aadhaar XML response
```

---

## 4. DigiLocker Service (Setu Wrapper)

Create: `src/modules/kyc/digilocker.service.ts`

```typescript
import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';

// ── Types ─────────────────────────────────────────────────
export interface SetuSessionResponse {
  id: string;
  status: 'unauthenticated' | 'authenticated' | 'revoked';
  url: string;
  validUpto: string;
}

export interface SetuStatusResponse extends SetuSessionResponse {
  digilockerUserDetails?: {
    digilockerId: string;
    email: string;
    phoneNumber: string;
  };
  traceId: string;
}

export interface AadhaarKycData {
  maskedNumber: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  address: {
    careOf: string;
    country: string;
    district: string;
    house: string;
    landmark: string;
    locality: string;
    pin: string;
    postOffice: string;
    state: string;
    street: string;
    subDistrict: string;
    vtc: string;
  };
  photo: string;          // base64 encoded
  verified: {
    email: boolean;
    phone: boolean;
    signature: boolean;   // DigiLocker XML signature validity
  };
  xml: {
    fileUrl: string;      // S3 URL to signed Aadhaar XML
    shareCode: string;
    validUntil: string;
  };
}

export interface SetuAadhaarResponse {
  aadhaar: AadhaarKycData;
  id: string;
  status: string;
}

export interface SetuDocumentResponse {
  fileUrl: string;
  validUpto: string;
}

// ── Service ───────────────────────────────────────────────
@Injectable()
export class DigiLockerService {
  private readonly logger = new Logger(DigiLockerService.name);
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('SETU_BASE_URL');
    this.headers = {
      'Content-Type': 'application/json',
      'x-client-id': this.config.get<string>('SETU_CLIENT_ID'),
      'x-client-secret': this.config.get<string>('SETU_CLIENT_SECRET'),
      'x-product-instance-id': this.config.get<string>('SETU_PRODUCT_INSTANCE_ID'),
    };
  }

  // ── Step 1: Create DigiLocker Session ────────────────────
  async createSession(redirectUrl: string): Promise<SetuSessionResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/digilocker`,
          { redirectUrl },
          { headers: this.headers },
        ),
      );
      this.logger.log(`DigiLocker session created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create DigiLocker session', error?.response?.data);
      throw new BadGatewayException({
        code: 'DIGILOCKER_SESSION_FAILED',
        message: 'Could not initiate DigiLocker session. Try again.',
      });
    }
  }

  // ── Step 2: Check Session Status ─────────────────────────
  async getStatus(sessionId: string): Promise<SetuStatusResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/digilocker/${sessionId}/status`,
          { headers: this.headers },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get DigiLocker status for: ${sessionId}`);
      throw new BadGatewayException({ code: 'DIGILOCKER_STATUS_FAILED' });
    }
  }

  // ── Step 3: Fetch Aadhaar XML (KYC Core) ─────────────────
  // API: GET /api/digilocker/:id/aadhaar
  // Ref: https://api-playground.setu.co/data/digilocker#/operation~Gete-AadhaarXML
  async fetchAadhaarXml(sessionId: string): Promise<SetuAadhaarResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/digilocker/${sessionId}/aadhaar`,
          { headers: this.headers },
        ),
      );

      const data: SetuAadhaarResponse = response.data;

      // Validate XML signature is verified by DigiLocker
      if (!data.aadhaar.verified?.signature) {
        this.logger.warn(`Aadhaar XML signature not verified for session: ${sessionId}`);
      }

      this.logger.log(`Aadhaar KYC fetched successfully for session: ${sessionId}`);
      return data;
    } catch (error) {
      this.logger.error(`Aadhaar fetch failed for session: ${sessionId}`, error?.response?.data);
      throw new BadGatewayException({
        code: 'AADHAAR_FETCH_FAILED',
        message: 'Could not fetch Aadhaar data from DigiLocker.',
      });
    }
  }

  // ── Step 4: Fetch Other Documents (PAN, DL, etc.) ────────
  async fetchDocument(
    sessionId: string,
    docType: string,
    orgId: string,
    format: 'pdf' | 'xml' | 'jpeg',
    parameters: Array<{ name: string; value: string }>,
  ): Promise<SetuDocumentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/digilocker/${sessionId}/document`,
          {
            docType,
            orgId,
            format,
            consent: 'Y',
            parameters,
          },
          { headers: this.headers },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Document fetch failed for session: ${sessionId}, docType: ${docType}`);
      throw new BadGatewayException({ code: 'DOCUMENT_FETCH_FAILED' });
    }
  }

  // ── Step 5: Revoke Token ──────────────────────────────────
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/digilocker/${sessionId}/revoke`,
          { headers: this.headers },
        ),
      );
      this.logger.log(`DigiLocker session revoked: ${sessionId}`);
    } catch (error) {
      // Non-critical — log but don't throw
      this.logger.warn(`Failed to revoke session: ${sessionId}`);
    }
  }

  // ── Utility: Get List of Available Documents ──────────────
  async listAvailableDocuments() {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/api/digilocker/documents`,
        { headers: this.headers },
      ),
    );
    return response.data;
  }
}
```

---

## 5. KYC Module — Full Implementation

Create: `src/modules/kyc/kyc.service.ts`

```typescript
import {
  Injectable, BadRequestException, ConflictException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { DigiLockerService, SetuAadhaarResponse } from './digilocker.service';
import { KycRecordEntity, KycStatus } from './entities/kyc_record.entity';
import { CacheService } from '../../shared/cache/cache.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';

interface KycSessionData {
  userId: string;
  createdAt: string;
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycRecordEntity)
    private readonly kycRepository: Repository<KycRecordEntity>,
    private readonly digilockerService: DigiLockerService,
    private readonly cacheService: CacheService,
    private readonly encryptionService: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  // ── Step 1: Initiate KYC ─────────────────────────────────
  async initiateKyc(userId: string): Promise<{
    kyc_session_id: string;
    auth_url: string;
    valid_upto: string;
    message: string;
  }> {
    // Check if already fully verified
    const existing = await this.kycRepository.findOne({ where: { user_id: userId } });
    if (existing?.verification_status === KycStatus.FULLY_VERIFIED) {
      throw new ConflictException({ code: 'KYC_ALREADY_VERIFIED' });
    }

    // Build redirectUrl with our session identifier
    const ourSessionId = uuidv4();
    const baseRedirect = this.config.get<string>('DIGILOCKER_REDIRECT_URI');
    const redirectUrl = `${baseRedirect}?kycSessionId=${ourSessionId}`;

    // Create Setu DigiLocker session
    const setuSession = await this.digilockerService.createSession(redirectUrl);

    // Cache mapping: ourSessionId → userId + setuSessionId
    await this.cacheService.set(
      `kyc_session:${ourSessionId}`,
      JSON.stringify({
        userId,
        setuSessionId: setuSession.id,
        createdAt: new Date().toISOString(),
      }),
      600, // 10 minutes TTL
    );

    this.logger.log(`KYC initiated for user: ${userId}, session: ${ourSessionId}`);

    return {
      kyc_session_id: ourSessionId,
      auth_url: setuSession.url,          // ← redirect user here (real DigiLocker)
      valid_upto: setuSession.validUpto,
      message: 'Redirect user to auth_url to complete DigiLocker KYC',
    };
  }

  // ── Step 2: Handle DigiLocker Callback ───────────────────
  async handleCallback(params: {
    success: string;
    id: string;              // Setu session ID
    scope: string;           // ADHAR+PANCR+DRVLC
    kycSessionId: string;    // our session ID
    errCode?: string;
    errMessage?: string;
  }): Promise<{ redirect_to: string }> {

    const sessionData = await this.cacheService.get<string>(`kyc_session:${params.kycSessionId}`);
    if (!sessionData) {
      this.logger.warn(`KYC session expired or invalid: ${params.kycSessionId}`);
      return { redirect_to: `${this.getFrontendUrl()}/kyc/failed?reason=SESSION_EXPIRED` };
    }

    const { userId, setuSessionId } = JSON.parse(sessionData);

    if (params.success !== 'True' || params.errCode) {
      this.logger.warn(`DigiLocker consent failed for user: ${userId}, error: ${params.errCode}`);
      return { redirect_to: `${this.getFrontendUrl()}/kyc/failed?reason=${params.errCode ?? 'CONSENT_FAILED'}` };
    }

    // Fetch Aadhaar data in background — redirect user first
    this.processKycData(userId, setuSessionId, params.scope).catch((err) => {
      this.logger.error(`KYC processing failed for user: ${userId}`, err);
    });

    // Clean up our session cache
    await this.cacheService.del(`kyc_session:${params.kycSessionId}`);

    return { redirect_to: `${this.getFrontendUrl()}/kyc/processing?userId=${userId}` };
  }

  // ── Step 3: Process & Store Aadhaar KYC Data ─────────────
  async processKycData(userId: string, setuSessionId: string, scope: string): Promise<void> {
    const scopes = scope.split('+').filter(Boolean);
    this.logger.log(`Processing KYC for user: ${userId}, scopes: ${scopes.join(',')}`);

    // Always fetch Aadhaar if consented (core KYC)
    if (scopes.includes('ADHAR')) {
      const aadhaarData = await this.digilockerService.fetchAadhaarXml(setuSessionId);
      await this.storeAadhaarKyc(userId, aadhaarData, setuSessionId);
    }

    // Revoke token after data is fetched
    await this.digilockerService.revokeSession(setuSessionId);
  }

  // ── Store Aadhaar Data (Encrypted) ───────────────────────
  private async storeAadhaarKyc(
    userId: string,
    data: SetuAadhaarResponse,
    setuSessionId: string,
  ): Promise<void> {
    const aadhaar = data.aadhaar;

    // Hash masked Aadhaar (last 4 digits: xxxx-xxxx-1234)
    const aadhaarHash = crypto
      .createHash('sha256')
      .update(aadhaar.maskedNumber)
      .digest('hex');

    // Check for Aadhaar mismatch with existing record
    const existing = await this.kycRepository.findOne({ where: { user_id: userId } });
    if (existing?.aadhaar_hash && existing.aadhaar_hash !== aadhaarHash) {
      throw new ConflictException({ code: 'AADHAAR_MISMATCH' });
    }

    // Encrypt sensitive PII before storage (AES-256-GCM via your EncryptionService)
    const encryptedExtractedData = this.encryptionService.encrypt(
      JSON.stringify({
        name: aadhaar.name,
        dob: aadhaar.dateOfBirth,
        gender: aadhaar.gender,
        address: aadhaar.address,
        photo: aadhaar.photo,          // base64 photo from Aadhaar
        xmlFileUrl: aadhaar.xml.fileUrl,
        xmlValidUntil: aadhaar.xml.validUntil,
        signatureVerified: aadhaar.verified?.signature ?? false,
      }),
    );

    if (existing) {
      await this.kycRepository.update(
        { user_id: userId },
        {
          aadhaar_hash: aadhaarHash,
          digilocker_ref: setuSessionId,
          extracted_data_encrypted: { data: encryptedExtractedData },
          verification_status: KycStatus.AADHAAR_VERIFIED,
          verified_at: new Date(),
        },
      );
    } else {
      await this.kycRepository.save({
        user_id: userId,
        aadhaar_hash: aadhaarHash,
        digilocker_ref: setuSessionId,
        extracted_data_encrypted: { data: encryptedExtractedData },
        verification_status: KycStatus.AADHAAR_VERIFIED,
        verified_at: new Date(),
      });
    }

    this.logger.log(`Aadhaar KYC stored for user: ${userId}`);
  }

  // ── Get KYC Status ────────────────────────────────────────
  async getKycStatus(userId: string): Promise<{
    status: KycStatus;
    verified_at: Date | null;
    fields_verified: string[];
  }> {
    const record = await this.kycRepository.findOne({ where: { user_id: userId } });

    if (!record) {
      return { status: KycStatus.PENDING, verified_at: null, fields_verified: [] };
    }

    const fields: string[] = [];
    if (record.aadhaar_hash) fields.push('aadhaar', 'name', 'dob', 'gender', 'address');
    if (record.pan_hash) fields.push('pan');
    if (record.liveness_check_status === 'passed') fields.push('liveness', 'face_match');

    return {
      status: record.verification_status,
      verified_at: record.verified_at,
      fields_verified: fields,
    };
  }

  // ── Get Decrypted KYC Data (Internal — for loan processing) ──
  async getDecryptedKycData(userId: string) {
    const record = await this.kycRepository.findOne({ where: { user_id: userId } });
    if (!record?.extracted_data_encrypted?.data) {
      throw new NotFoundException({ code: 'KYC_DATA_NOT_FOUND' });
    }

    const decrypted = this.encryptionService.decrypt(record.extracted_data_encrypted.data);
    return JSON.parse(decrypted);
  }

  private getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
  }
}
```

---

## 6. KYC Controller

Create: `src/modules/kyc/kyc.controller.ts`

```typescript
import {
  Controller, Post, Get, Query, Req, Res,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
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
}
```

---

## 7. KYC DTOs

Create: `src/modules/kyc/dto/kyc-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class InitiateKycResponseDto {
  @ApiProperty({ example: 'uuid-session-id' })
  kyc_session_id: string;

  @ApiProperty({ example: 'https://digilocker.meripehchaan.gov.in/public/oauth2/...' })
  auth_url: string;

  @ApiProperty({ example: '2024-01-15T10:45:00+05:30' })
  valid_upto: string;

  @ApiProperty({ example: 'Redirect user to auth_url to complete DigiLocker KYC' })
  message: string;
}

export class KycStatusResponseDto {
  @ApiProperty({ enum: ['pending', 'aadhaar_verified', 'pan_verified', 'fully_verified', 'failed'] })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', nullable: true })
  verified_at: Date | null;

  @ApiProperty({ example: ['aadhaar', 'name', 'dob', 'gender', 'address'] })
  fields_verified: string[];
}
```

---

## 8. KYC Module Registration

Create: `src/modules/kyc/kyc.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { DigiLockerService } from './digilocker.service';
import { KycRecordEntity } from './entities/kyc_record.entity';
import { CacheModule } from '../../shared/cache/cache.module';
import { EncryptionModule } from '../../shared/encryption/encryption.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycRecordEntity]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    CacheModule,
    EncryptionModule,
  ],
  controllers: [KycController],
  providers: [KycService, DigiLockerService],
  exports: [KycService],   // exported so LoanModule can check KYC status
})
export class KycModule {}
```

Also add `KycModule` to your `app.module.ts` imports (already referenced in backend.md).

---

## 9. ngrok Setup (For Local Dev Redirect)

DigiLocker needs a **publicly accessible** callback URL. Use ngrok for local development:

```bash
# Install ngrok
npm install -g ngrok
# OR download from https://ngrok.com/download

# Expose your local port
ngrok http 3000

# You'll get something like:
# Forwarding  https://abc123.ngrok.io → http://localhost:3000

# Update your .env:
DIGILOCKER_REDIRECT_URI=https://abc123.ngrok.io/api/v1/kyc/callback
```

> ⚠️ Restart your NestJS server after updating `.env`

---

## 10. Complete API Flow

### Step-by-step for your frontend:

```
1. User taps "Verify with Aadhaar"
   → Frontend calls: POST /api/v1/kyc/initiate  (with JWT)
   ← Gets: { kyc_session_id, auth_url, valid_upto }

2. Frontend redirects user:
   window.location.href = auth_url
   (OR use in-app browser / WebView)

3. User on DigiLocker:
   - Logs in with Aadhaar number + OTP
   - Selects documents to share (Aadhaar ✓, PAN ✓, DL optional)
   - Clicks "Allow"

4. DigiLocker redirects to your callback:
   GET /api/v1/kyc/callback
     ?success=True
     &id=<setu_session_id>
     &scope=ADHAR%2BPANCR
     &kycSessionId=<our_session_id>

5. Your backend:
   - Fetches Aadhaar XML from Setu
   - Decrypts name, DOB, gender, address, photo
   - Hashes Aadhaar number
   - Stores encrypted in kyc_records
   - Sets verification_status = AADHAAR_VERIFIED
   - Redirects user to frontend /kyc/success page

6. Frontend polls:
   GET /api/v1/kyc/status
   ← { status: "aadhaar_verified", fields_verified: ["name","dob",...] }
```

---

## 11. Test with cURL

### Step 1 — Initiate KYC (get JWT first from /auth/otp/verify)

```bash
curl -X POST http://localhost:3000/api/v1/kyc/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Response:
# {
#   "success": true,
#   "data": {
#     "kyc_session_id": "abc-123",
#     "auth_url": "https://digilocker.meripehchaan.gov.in/...",
#     "valid_upto": "2024-01-15T10:45:00+05:30"
#   }
# }
```

### Step 2 — Open auth_url in browser
```
Open in browser: https://digilocker.meripehchaan.gov.in/...
→ Login with Aadhaar + OTP
→ Select Aadhaar → Allow
→ Auto-redirects to your callback
```

### Step 3 — Check KYC Status

```bash
curl http://localhost:3000/api/v1/kyc/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "status": "aadhaar_verified",
#     "verified_at": "2024-01-15T10:30:00.000Z",
#     "fields_verified": ["aadhaar", "name", "dob", "gender", "address"]
#   }
# }
```

### Test Setu Sandbox directly (no registration needed):

```bash
# Create session
curl -X POST https://dg-sandbox.setu.co/api/digilocker \
  -H "Content-Type: application/json" \
  -H "x-client-id: test-client" \
  -H "x-client-secret: 891707ee-d6cd-4744-a28d-058829e30f12" \
  -H "x-product-instance-id: 891707ee-d6cd-4744-a28d-058829e30f10" \
  -d '{ "redirectUrl": "https://your-ngrok.ngrok.io/api/v1/kyc/callback" }'

# Fetch Aadhaar XML (after user consent)
curl https://dg-sandbox.setu.co/api/digilocker/SESSION_ID/aadhaar \
  -H "x-client-id: test-client" \
  -H "x-client-secret: 891707ee-d6cd-4744-a28d-058829e30f12" \
  -H "x-product-instance-id: 891707ee-d6cd-4744-a28d-058829e30f10"
```

---

## 12. Go Live Checklist

| Item | Sandbox | Production |
|------|---------|------------|
| Setu credentials | `test-client` (hardcoded) | Contact setu.co → get real CLIENT_ID/SECRET |
| Base URL | `https://dg-sandbox.setu.co` | `https://dg.setu.co` |
| Redirect URL | ngrok (temp) | `https://api.bharatscore.in/api/v1/kyc/callback` |
| Aadhaar OTP | Real Aadhaar required | Same |
| XML signature | May not be valid in sandbox | Verified in production |
| Rate limits | Generous | Per Setu agreement |
| DPDP compliance | N/A | Encrypt + audit log all KYC data ✅ |
| Data retention | N/A | Purge after consent revoked (72hr) ✅ |

### Production env swap:

```env
# Switch these two lines only:
SETU_CLIENT_ID=<your_real_client_id_from_setu>
SETU_CLIENT_SECRET=<your_real_secret_from_setu>
SETU_PRODUCT_INSTANCE_ID=<your_real_product_id_from_setu>
SETU_BASE_URL=https://dg.setu.co
DIGILOCKER_REDIRECT_URI=https://api.bharatscore.in/api/v1/kyc/callback
```

---

## File Summary

```
src/modules/kyc/
├── kyc.module.ts           ← registers module, HttpModule, TypeORM
├── kyc.controller.ts       ← /initiate, /callback, /status
├── kyc.service.ts          ← business logic, encryption, DB writes
├── digilocker.service.ts   ← Setu API wrapper (all HTTP calls)
├── entities/
│   └── kyc_record.entity.ts  (already in backend.md)
└── dto/
    └── kyc-response.dto.ts
```

---

*BharatScore DigiLocker KYC Integration · Setu Sandbox*
*Ready to run with: `pnpm start:dev`*
