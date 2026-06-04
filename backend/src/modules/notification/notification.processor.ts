import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { I18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
// import { UserEntity } from '../user/entities/user.entity';
// import { SmsService } from '../../shared/sms/sms.service';

export interface QueueNotificationParams {
  notificationId: string;
  userId: string;
  eventType: string;
  channel: 'sms' | 'whatsapp' | 'email' | 'push';
  data: any;
}

@Processor('notifications')
export class NotificationProcessor {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly i18n: I18nService,
    // @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    // private readonly smsService: SmsService,
  ) {}

  @Process('send')
  async processNotification(job: Job<QueueNotificationParams>) {
    const { notificationId, userId, eventType, channel, data } = job.data;
    
    // Fetch user for locale and contact info
    // const user = await this.userRepository.findOne({ where: { id: userId } });
    // const lang = user?.locale ?? 'en';
    const lang = 'en'; // Mock for now until UserModule is fully integrated

    const content = await this.buildContent(eventType, data, lang);

    switch (channel) {
      case 'sms':
        // await this.smsService.send(user.mobile_number, content.text);
        console.log(`[Mock SMS to User ${userId}]: ${content.text}`);
        break;
      case 'whatsapp':
        console.log(`[Mock WA to User ${userId}]: ${content.template}`);
        break;
      case 'email':
        console.log(`[Mock Email to User ${userId}]`);
        break;
      case 'push':
        console.log(`[Mock Push to User ${userId}]`);
        break;
    }

    await this.notificationRepository.update(notificationId, { status: 'sent' as any });
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
