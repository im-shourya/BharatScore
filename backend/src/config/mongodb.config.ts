import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/credsaathi_behavioral',
  dbName: process.env.MONGODB_DB_NAME || 'credsaathi_behavioral',
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000', 10),
  connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '10000', 10),
  heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS || '10000', 10),
  maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '120000', 10),
}));
