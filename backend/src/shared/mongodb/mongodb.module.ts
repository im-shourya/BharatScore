import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
        dbName: config.get<string>('mongodb.dbName'),
        maxPoolSize: config.get<number>('mongodb.maxPoolSize', 20),
        minPoolSize: config.get<number>('mongodb.minPoolSize', 5),
        serverSelectionTimeoutMS: config.get<number>('mongodb.serverSelectionTimeoutMS', 5000),
        socketTimeoutMS: config.get<number>('mongodb.socketTimeoutMS', 45000),
        connectTimeoutMS: config.get<number>('mongodb.connectTimeoutMS', 10000),
        heartbeatFrequencyMS: config.get<number>('mongodb.heartbeatFrequencyMS', 10000),
        maxIdleTimeMS: config.get<number>('mongodb.maxIdleTimeMS', 120000),
        // CSFLE keys would be injected here in a production setup
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class MongodbModule {}
