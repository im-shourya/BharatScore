import { registerAs } from '@nestjs/config';

export default registerAs('ml', () => ({
  serviceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  timeoutMs: parseInt(process.env.ML_TIMEOUT_MS || '30000', 10),
}));
