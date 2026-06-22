import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  async sendTemplateMessage(mobile: string, templateName: string, parameters: any[] = []): Promise<boolean> {
    const enabled = this.config.get<boolean>('notification.whatsapp.enabled');

    if (!enabled) {
      this.logger.warn(`💬 [WHATSAPP DISABLED] To: ${mobile} | Template: ${templateName}`);
      return true;
    }

    const apiToken = this.config.get<string>('notification.whatsapp.apiToken');
    const phoneId = this.config.get<string>('notification.whatsapp.phoneId');
    const apiUrl = this.config.get<string>('notification.whatsapp.apiUrl');

    if (!apiToken || !phoneId) {
      this.logger.error('WhatsApp API credentials are not configured.');
      return false;
    }

    const url = `${apiUrl}/${phoneId}/messages`;
    
    // Formatting parameters for Meta Cloud API
    const components = parameters.length > 0 ? [
      {
        type: 'body',
        parameters: parameters.map(p => ({ type: 'text', text: String(p) })),
      }
    ] : [];

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: this.formatMobile(mobile),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      this.logger.log(`✅ WhatsApp template '${templateName}' sent to ${mobile}`);
      return true;
    } catch (error) {
      const errMsg = error?.response?.data?.error?.message || error.message || 'Unknown error';
      this.logger.error(`❌ WhatsApp delivery failed to ${mobile}: ${errMsg}`);
      return false;
    }
  }

  private formatMobile(mobile: string): string {
    // Meta API expects country code without +
    let formatted = mobile.replace(/\D/g, '');
    if (formatted.length === 10) formatted = `91${formatted}`; // default to India
    return formatted;
  }
}
