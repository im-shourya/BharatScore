import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../user/entities/user.entity';
import { SmsModule } from '../../shared/sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, UserEntity]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    SmsModule,
  ],
  providers: [NotificationService, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}

