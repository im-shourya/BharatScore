import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../user/entities/user.entity';
import { SmsService } from '../../shared/sms/sms.service';

export interface QueueNotificationParams {
  notificationId: string;
  userId: string;
  eventType: string;
  channel: 'sms' | 'whatsapp' | 'email' | 'push';
  data: any;
}

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly i18n: I18nService,
    private readonly smsService: SmsService,
  ) {}

  @Process('send')
  async processNotification(job: Job<QueueNotificationParams>) {
    const { notificationId, userId, eventType, channel, data } = job.data;
    
    // Fetch user for locale and contact info
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const lang = user?.locale ?? 'en';

    const content = await this.buildContent(eventType, data, lang);

    switch (channel) {
      case 'sms':
        if (user?.mobile_number) {
          const result = await this.smsService.sendOtp(user.mobile_number, content.text).catch(err => {
            this.logger.error(`SMS delivery failed for user ${userId}: ${err.message}`);
            return { success: false, error: err.message };
          });
          if (result.success) {
            this.logger.log(`SMS sent to user ${userId}`);
          }
        } else {
          this.logger.warn(`No mobile number for user ${userId}, skipping SMS`);
        }
        break;
      case 'whatsapp':
        this.logger.log(`[WhatsApp to User ${userId}]: ${content.template}`);
        break;
      case 'email':
        this.logger.log(`[Email to User ${userId}]`);
        break;
      case 'push':
        this.logger.log(`[Push to User ${userId}]`);
        break;
    }

    await this.notificationRepository.update(notificationId, { status: 'sent' as any }).catch(() => {
      // Non-critical — notification record may not exist yet
      this.logger.warn(`Could not update notification status for: ${notificationId}`);
    });
  }

  private async buildContent(eventType: string, data: any, lang: string) {
    const templates: Record<string, (d: any, l: string) => Promise<any>> = {
      LOAN_SUBMITTED: async (d, l) => ({
        text: await this.i18n.translate('notifications.loan_submitted', { lang: l, args: d }),
        template: 'loan_submitted',
        params: d,
      }),
      SCORE_GENERATED: async (d, l) => ({
        text: await this.i18n.translate('notifications.score_ready', { lang: l, args: d }),
      }),
    };

    const handler = templates[eventType] ?? templates['LOAN_SUBMITTED'];
    return handler(data, lang).catch(() => ({ text: 'Notification fallback' }));
  }
}

