import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { EncryptionService } from '../../shared/encryption/encryption.service';
// import { KafkaProducerService } from '../../shared/kafka/kafka-producer.service';
import { I18nService } from 'nestjs-i18n';
import { UserEntity } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly encryptionService: EncryptionService,
    // private readonly kafkaProducer: KafkaProducerService,
    private readonly i18n: I18nService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    return this.mapToResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updates: Partial<UserEntity> = {};
    if (dto.name) updates.full_name_encrypted = this.encryptionService.encrypt(dto.name);
    if (dto.email) updates.email_encrypted = this.encryptionService.encrypt(dto.email);
    if (dto.locale) updates.locale = dto.locale;
    
    const user = await this.userRepository.updateById(userId, updates);
    return this.mapToResponse(user);
  }

  async requestDeletion(userId: string) {
    await this.userRepository.updateById(userId, { status: UserStatus.DELETED });
    // await this.kafkaProducer.emit('user-deletion-requests', {
    //   userId,
    //   requestedAt: new Date(),
    //   scheduledDeletionAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    // });
    return { message: 'Deletion request accepted. Data will be purged within 72 hours.' };
  }

  async advanceOnboardingStep(userId: string, step: number, data: Record<string, any>) {
    await this.userRepository.updateById(userId, { onboarding_step: step });
    // await this.kafkaProducer.emit('onboarding-events', { userId, step, data });
    return { current_step: step, next_step: step + 1 };
  }

  private mapToResponse(user: UserEntity) {
    return {
      id: user.id,
      name: user.full_name_encrypted ? this.encryptionService.decrypt(user.full_name_encrypted) : null,
      email: user.email_encrypted ? this.encryptionService.decrypt(user.email_encrypted) : null,
      mobile: user.mobile_number.replace(/.(?=.{4})/g, '*'),
      role: user.role,
      status: user.status,
      locale: user.locale,
      kyc_status: null, // Would fetch from KYC module
      onboarding_step: user.onboarding_step,
      created_at: user.created_at,
    };
  }
}
