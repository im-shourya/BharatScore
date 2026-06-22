import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
    const enabled = this.config.get<boolean>('notification.email.enabled');

    if (!enabled) {
      this.logger.warn(`✉️ [EMAIL DISABLED] To: ${to} | Subject: ${subject}`);
      return true;
    }

    const apiKey = this.config.get<string>('notification.email.apiKey');
    const sender = this.config.get<string>('notification.email.sender');
    const apiUrl = this.config.get<string>('notification.email.apiUrl');

    if (!apiKey) {
      this.logger.error('EMAIL_API_KEY is not configured.');
      return false;
    }

    try {
      // Assuming a Resend-like API payload
      await axios.post(
        apiUrl || '',
        {
          from: sender,
          to: [to],
          subject: subject,
          html: htmlBody,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      this.logger.log(`✅ Email sent to ${to}`);
      return true;
    } catch (error) {
      const errMsg = error?.response?.data?.message || error.message || 'Unknown error';
      this.logger.error(`❌ Email delivery failed to ${to}: ${errMsg}`);
      return false;
    }
  }
}
