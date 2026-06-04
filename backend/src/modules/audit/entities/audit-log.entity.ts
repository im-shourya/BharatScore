import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('audit_logs')
@Index(['entity_type', 'entity_id', 'logged_at'])
@Index(['actor_id', 'logged_at'])
@Index(['action', 'logged_at'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actor_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: UserEntity;

  @Column({ length: 50, nullable: true })
  actor_role: string;

  @Column({ length: 50 })
  entity_type: string;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 64 })
  payload_hash: string;

  @Column({ length: 64, nullable: true })
  prev_hash: string;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ length: 50, nullable: true })
  request_id: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  logged_at: Date;
}
