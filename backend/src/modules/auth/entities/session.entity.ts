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

@Entity('sessions')
@Index(['jwt_jti'], { unique: true })
@Index(['refresh_token_hash'], { unique: true })
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ length: 200, unique: true })
  jwt_jti: string;

  @Column({ length: 128, unique: true })
  refresh_token_hash: string;

  @Column({ length: 300, nullable: true })
  device_fingerprint: string;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ length: 50, nullable: true })
  platform: string;

  @Column({ length: 20, nullable: true })
  app_version: string;

  @Column({ default: false })
  is_revoked: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  @Column({ length: 100, nullable: true })
  revoked_reason: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  last_used_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
