import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SmsResult {
  success: boolean;
  request_id?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Send a 6-digit OTP to an Indian mobile number via Fast2SMS.
   *
   * @param mobile  E.164 format Indian mobile (e.g. +919876543210)
   * @param otp     6-digit numeric OTP string
   * @returns       SmsResult with delivery status
   */
  async sendOtp(mobile: string, otp: string): Promise<SmsResult> {
    const enabled = this.config.get<boolean>('sms.enabled');

    if (!enabled) {
      this.logger.warn(`📱 [SMS DISABLED] OTP for ${this.maskMobile(mobile)}: ${otp}`);
      return { success: true, request_id: 'dev-mode-skipped' };
    }

    const apiKey = this.config.get<string>('sms.fast2sms.apiKey');
    const baseUrl = this.config.get<string>('sms.fast2sms.baseUrl') || 'https://www.fast2sms.com/dev/bulkV2';

    if (!apiKey) {
      this.logger.error('FAST2SMS_API_KEY is not configured. Cannot send SMS.');
      return { success: false, error: 'SMS provider not configured' };
    }

    // Fast2SMS expects 10-digit number without country code
    const number = this.stripCountryCode(mobile);

    try {
      const response = await axios.post(
        baseUrl,
        null,
        {
          params: {
            authorization: apiKey,
            route: 'otp',
            variables_values: otp,
            numbers: number,
          },
          headers: {
            'cache-control': 'no-cache',
          },
          timeout: 10000, // 10 second timeout
        },
      );

      if (response.data?.return === true) {
        this.logger.log(
          `✅ OTP sent to ${this.maskMobile(mobile)} | request_id: ${response.data.request_id}`,
        );
        return {
          success: true,
          request_id: response.data.request_id,
        };
      }

      // Fast2SMS returned a non-success response
      this.logger.error(
        `❌ Fast2SMS error for ${this.maskMobile(mobile)}: ${JSON.stringify(response.data?.message)}`,
      );
      return {
        success: false,
        error: Array.isArray(response.data?.message)
          ? response.data.message.join(', ')
          : 'SMS delivery failed',
      };
    } catch (error) {
      const errMsg = error?.response?.data?.message || error.message || 'Unknown error';
      this.logger.error(`❌ SMS delivery failed for ${this.maskMobile(mobile)}: ${errMsg}`);

      return {
        success: false,
        error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
      };
    }
  }

  /**
   * Strip +91 country code to get 10-digit number for Fast2SMS.
   */
  private stripCountryCode(mobile: string): string {
    if (mobile.startsWith('+91')) {
      return mobile.slice(3);
    }
    if (mobile.startsWith('91') && mobile.length === 12) {
      return mobile.slice(2);
    }
    return mobile;
  }

  /**
   * Mask mobile number for safe logging: +919876543210 → +91****3210
   */
  private maskMobile(mobile: string): string {
    return mobile.replace(/.(?=.{4})/g, '*');
  }
}
