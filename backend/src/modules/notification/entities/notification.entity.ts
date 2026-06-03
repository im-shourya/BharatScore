import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum';
import { NotificationStatus } from '../../../common/enums/notification-status.enum';

@Entity('notifications')
@Index(['user_id', 'created_at'])
@Index(['status', 'scheduled_at'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ length: 100 })
  event_type: string;

  @Column({ length: 100, nullable: true })
  template_id: string;

  @Column({ type: 'text', nullable: true })
  content_encrypted: string;

  @Column({ length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.QUEUED })
  status: NotificationStatus;

  @Column({ type: 'smallint', default: 0 })
  retry_count: number;

  @Column({ type: 'smallint', default: 3 })
  max_retries: number;

  @Column({ length: 50, nullable: true })
  provider: string;

  @Column({ length: 200, nullable: true })
  provider_msg_id: string;

  @Column({ type: 'jsonb', nullable: true })
  provider_response: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  failed_at: Date;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
