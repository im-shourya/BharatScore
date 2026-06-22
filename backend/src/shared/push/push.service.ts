import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPushNotification(deviceToken: string, title: string, body: string, dataPayload: any = {}): Promise<boolean> {
    const enabled = this.config.get<boolean>('notification.push.enabled');

    if (!enabled) {
      this.logger.warn(`🔔 [PUSH DISABLED] Token: ${deviceToken.substring(0, 10)}... | Title: ${title}`);
      return true;
    }

    const serverKey = this.config.get<string>('notification.push.serverKey');
    const apiUrl = this.config.get<string>('notification.push.apiUrl');

    if (!serverKey) {
      this.logger.error('Push server key (FCM) is not configured.');
      return false;
    }

    try {
      // Targeting Firebase Cloud Messaging legacy HTTP format (or adaptable to v1)
      await axios.post(
        apiUrl || '',
        {
          to: deviceToken,
          notification: {
            title,
            body,
            sound: 'default',
          },
          data: dataPayload,
        },
        {
          headers: {
            Authorization: `key=${serverKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      this.logger.log(`✅ Push notification sent to token ${deviceToken.substring(0, 10)}...`);
      return true;
    } catch (error) {
      const errMsg = error?.response?.data || error.message || 'Unknown error';
      this.logger.error(`❌ Push delivery failed: ${typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)}`);
      return false;
    }
  }
}
