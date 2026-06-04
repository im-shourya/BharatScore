import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConsentRepository } from './consent.repository';
import { ConsentScope } from '../../common/enums/consent-scope.enum';
import { DataSource } from '../../common/enums/data-source.enum';
import * as crypto from 'crypto';

@Injectable()
export class ConsentService {
  constructor(
    private readonly consentRepository: ConsentRepository,
  ) {}

  async recordConsent(userId: string, scope: string, purpose: string, ipAddress: string, userAgent: string, validDays = 90) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);
    
    const signaturePayload = `${userId}:${scope}:${purpose}:${Date.now()}`;
    const digitalSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const consent = await this.consentRepository.createOrUpdate({
      user_id: userId,
      scope: scope as ConsentScope,
      purpose_code: purpose,
      data_source: DataSource.BANK,
      is_active: true,
      valid_until: validUntil,
      consent_hash: digitalSignature,
    });

    return consent;
  }

  async checkConsent(userId: string, scope: string, purpose: string): Promise<boolean> {
    const consent = await this.consentRepository.findActiveConsent(userId, scope as ConsentScope, purpose);
    if (!consent) return false;
    if (consent.valid_until && consent.valid_until < new Date()) {
      await this.consentRepository.revoke(userId, scope as ConsentScope, purpose);
      return false;
    }
    return true;
  }

  async revokeConsent(userId: string, scope: string, purpose: string, ipAddress: string, userAgent: string) {
    await this.consentRepository.revoke(userId, scope as ConsentScope, purpose);
    return { message: 'Consent revoked successfully' };
  }

  async getUserConsents(userId: string) {
    return this.consentRepository.findAllForUser(userId);
  }
}
