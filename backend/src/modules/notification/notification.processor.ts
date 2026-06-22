import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../user/entities/user.entity';
import { SmsService } from '../../shared/sms/sms.service';
import { WhatsappService } from '../../shared/whatsapp/whatsapp.service';
import { EmailService } from '../../shared/email/email.service';
import { PushService } from '../../shared/push/push.service';
import { EncryptionService } from '../../shared/encryption/encryption.service';

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
    private readonly whatsappService: WhatsappService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly encryptionService: EncryptionService,
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
          if (result?.success) {
            this.logger.log(`SMS sent to user ${userId}`);
          }
        } else {
          this.logger.warn(`No mobile number for user ${userId}, skipping SMS`);
        }
        break;

      case 'whatsapp':
        if (user?.mobile_number && content.template) {
          const success = await this.whatsappService.sendTemplateMessage(user.mobile_number, content.template, content.params ? Object.values(content.params) : []);
          if (success) this.logger.log(`WhatsApp sent to user ${userId}`);
        } else {
          this.logger.warn(`No mobile/template for user ${userId}, skipping WhatsApp`);
        }
        break;

      case 'email':
        if (user?.email_encrypted && content.subject && content.html) {
          const email = this.encryptionService.decrypt(user.email_encrypted);
          const success = await this.emailService.sendEmail(email, content.subject, content.html);
          if (success) this.logger.log(`Email sent to user ${userId}`);
        } else {
          this.logger.warn(`No email config for user ${userId}, skipping Email`);
        }
        break;

      case 'push':
        if (user?.fcm_token && content.pushTitle && content.pushBody) {
          const success = await this.pushService.sendPushNotification(user.fcm_token, content.pushTitle, content.pushBody, content.dataPayload);
          if (success) this.logger.log(`Push sent to user ${userId}`);
        } else {
          this.logger.warn(`No FCM token for user ${userId}, skipping Push`);
        }
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
        template: 'loan_submitted_template',
        params: d,
        subject: 'Your Loan Application is Submitted',
        html: `<h1>Loan Application Received</h1><p>We've received your request for ${d.amount}.</p>`,
        pushTitle: 'Loan Submitted',
        pushBody: `Application for ${d.amount} is under review.`,
        dataPayload: { loanId: d.loanId },
      }),
      SCORE_GENERATED: async (d, l) => ({
        text: await this.i18n.translate('notifications.score_ready', { lang: l, args: d }),
        template: 'score_generated_template',
        params: d,
        subject: 'Your BharatScore is Ready!',
        html: `<h1>Score Generated</h1><p>Your BharatScore is now available to view.</p>`,
        pushTitle: 'Score Ready',
        pushBody: 'Your BharatScore is now available to view.',
      }),
      LOAN_APPROVED: async (d, l) => ({
        text: `Congratulations! Your loan of ${d.amount} has been approved.`,
        template: 'loan_approved_template',
        params: d,
        subject: 'Your Loan is Approved!',
        html: `<h1>Loan Approved!</h1><p>Your loan of ${d.amount} has been approved.</p>`,
        pushTitle: 'Loan Approved',
        pushBody: `Your loan of ${d.amount} has been approved.`,
      }),
      LOAN_REJECTED: async (d, l) => ({
        text: `We're sorry, your loan application was not approved.`,
        template: 'loan_rejected_template',
        params: d,
        subject: 'Update on your Loan Application',
        html: `<h1>Loan Update</h1><p>We're sorry, your loan application was not approved at this time.</p>`,
        pushTitle: 'Loan Update',
        pushBody: `We're sorry, your loan application was not approved.`,
      }),
      LOAN_DISBURSED: async (d, l) => ({
        text: `Your loan of ${d.amount} has been disbursed to your account.`,
        template: 'loan_disbursed_template',
        params: d,
        subject: 'Loan Disbursed',
        html: `<h1>Loan Disbursed</h1><p>Your loan of ${d.amount} has been disbursed.</p>`,
        pushTitle: 'Loan Disbursed',
        pushBody: `Your loan of ${d.amount} has been disbursed to your account.`,
      }),
      LOAN_CLOSED: async (d, l) => ({
        text: `Your loan has been successfully closed. Thank you!`,
        template: 'loan_closed_template',
        params: d,
        subject: 'Loan Closed',
        html: `<h1>Loan Closed</h1><p>Your loan has been fully repaid and closed. Thank you!</p>`,
        pushTitle: 'Loan Closed',
        pushBody: 'Your loan has been successfully closed.',
      }),
    };

    const handler = templates[eventType] ?? templates['LOAN_SUBMITTED'];
    return handler(data, lang).catch(() => ({ 
      text: 'Notification fallback',
      template: 'fallback_template',
      subject: 'Update from BharatScore',
      html: '<p>You have a new update from BharatScore.</p>',
      pushTitle: 'New Update',
      pushBody: 'You have a new update from BharatScore.'
    }));
  }
}


