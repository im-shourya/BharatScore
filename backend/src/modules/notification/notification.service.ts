import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueNotificationParams } from './notification.processor';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  async queueNotification(params: QueueNotificationParams) {
    await this.notificationQueue.add('send', params, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false,
      removeOnFail: false,
    });
  }
}
