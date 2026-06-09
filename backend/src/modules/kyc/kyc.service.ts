import {
  Injectable, ConflictException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { DigiLockerService, SetuAadhaarResponse } from './digilocker.service';
import { KycRecordEntity } from './entities/kyc-record.entity';
import { KycStatus } from '../../common/enums/kyc-status.enum';
import { CacheService } from '../../shared/cache/cache.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';

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
      auth_url: setuSession.url, // ← redirect user here (real DigiLocker)
      valid_upto: setuSession.validUpto,
      message: 'Redirect user to auth_url to complete DigiLocker KYC',
    };
  }

  async testSetuConnection() {
    return this.digilockerService.testConnection();
  }

  // ── Step 2: Handle DigiLocker Callback ───────────────────
  async handleCallback(params: {
    success: string;
    id: string; // Setu session ID
    scope: string; // ADHAR+PANCR+DRVLC
    kycSessionId: string; // our session ID
    errCode?: string;
    errMessage?: string;
  }): Promise<{ redirect_to: string }> {

    const sessionData = await this.cacheService.get<string>(`kyc_session:${params.kycSessionId}`);
    if (!sessionData) {
      this.logger.warn(`KYC session expired or invalid: ${params.kycSessionId}`);
      return { redirect_to: `${this.getFrontendUrl()}/kyc/failed?reason=SESSION_EXPIRED` };
    }

    const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    const { userId, setuSessionId } = parsed;

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

    // Encrypt sensitive PII before storage (AES-256-GCM via EncryptionService)
    const encryptedExtractedData = this.encryptionService.encrypt(
      JSON.stringify({
        name: aadhaar.name,
        dob: aadhaar.dateOfBirth,
        gender: aadhaar.gender,
        address: aadhaar.address,
        photo: aadhaar.photo, // base64 photo from Aadhaar
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
          aadhaar_verified_at: new Date(),
        } as any,
      );
    } else {
      await this.kycRepository.save({
        user_id: userId,
        aadhaar_hash: aadhaarHash,
        digilocker_ref: setuSessionId,
        extracted_data_encrypted: { data: encryptedExtractedData },
        verification_status: KycStatus.AADHAAR_VERIFIED,
        verified_at: new Date(),
        aadhaar_verified_at: new Date(),
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
