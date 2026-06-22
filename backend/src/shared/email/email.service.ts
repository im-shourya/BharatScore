import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.setupTransporter();
  }

  private setupTransporter() {
    const host = this.config.get<string>('notification.email.host') || 'smtp.gmail.com';
    const port = this.config.get<number>('notification.email.port') || 587;
    const user = this.config.get<string>('notification.email.user');
    const pass = this.config.get<string>('notification.email.pass');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
    const enabled = this.config.get<boolean>('notification.email.enabled');

    if (!enabled) {
      this.logger.warn(`✉️ [EMAIL DISABLED] To: ${to} | Subject: ${subject}`);
      return true;
    }

    if (!this.transporter) {
      this.logger.error('Email transporter not configured. Check SMTP credentials.');
      return false;
    }

    const sender = this.config.get<string>('notification.email.sender') || this.config.get<string>('notification.email.user');

    try {
      await this.transporter.sendMail({
        from: `"BharatScore" <${sender}>`,
        to,
        subject,
        html: htmlBody,
      });

      this.logger.log(`✅ Email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Email delivery failed to ${to}: ${error.message}`);
      return false;
    }
  }
}
