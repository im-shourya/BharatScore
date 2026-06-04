import { registerAs } from '@nestjs/config';

export default registerAs('sms', () => ({
  enabled: process.env.SMS_ENABLED === 'true',
  fast2sms: {
    apiKey: process.env.FAST2SMS_API_KEY || '',
    senderId: process.env.FAST2SMS_SENDER_ID || '',
    baseUrl: 'https://www.fast2sms.com/dev/bulkV2',
  },
}));
