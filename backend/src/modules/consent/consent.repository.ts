import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsentRecordEntity } from './entities/consent-record.entity';
import { ConsentScope } from '../../common/enums/consent-scope.enum';
import { DataSource } from '../../common/enums/data-source.enum';

@Injectable()
export class ConsentRepository {
  constructor(
    @InjectRepository(ConsentRecordEntity) private readonly consentRepo: Repository<ConsentRecordEntity>,
  ) {}

  async createOrUpdate(data: Partial<ConsentRecordEntity>): Promise<ConsentRecordEntity> {
    let consent = await this.consentRepo.findOne({
      where: { user_id: data.user_id, scope: data.scope, purpose_code: data.purpose_code },
    });
    
    if (consent) {
      consent.is_active = data.is_active as boolean;
      consent.valid_until = data.valid_until as Date;
    } else {
      consent = this.consentRepo.create(data);
    }
    
    return this.consentRepo.save(consent);
  }

  async findActiveConsent(userId: string, scope: ConsentScope, purposeCode: string): Promise<ConsentRecordEntity | null> {
    return this.consentRepo.findOne({
      where: { user_id: userId, scope, purpose_code: purposeCode, is_active: true },
    });
  }

  async findAllForUser(userId: string): Promise<ConsentRecordEntity[]> {
    return this.consentRepo.find({ where: { user_id: userId } });
  }

  async revoke(userId: string, scope: ConsentScope, purposeCode: string): Promise<void> {
    await this.consentRepo.update(
      { user_id: userId, scope, purpose_code: purposeCode },
      { is_active: false, revoked_at: new Date() },
    );
  }
}
