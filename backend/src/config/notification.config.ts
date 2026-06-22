import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    apiKey: process.env.EMAIL_API_KEY || '',
    sender: process.env.EMAIL_SENDER || 'hello@bharatscore.in',
    apiUrl: process.env.EMAIL_API_URL || 'https://api.resend.com/emails',
  },
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    phoneId: process.env.WHATSAPP_PHONE_ID || '',
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0',
  },
  push: {
    enabled: process.env.PUSH_ENABLED === 'true',
    serverKey: process.env.PUSH_SERVER_KEY || '',
    apiUrl: process.env.PUSH_API_URL || 'https://fcm.googleapis.com/fcm/send',
  },
}));
