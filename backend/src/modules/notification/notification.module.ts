import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationEntity } from './entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationService, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
