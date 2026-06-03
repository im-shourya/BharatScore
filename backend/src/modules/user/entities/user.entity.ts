import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

@Entity('users')
@Index(['role', 'status'])
@Index(['created_at'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15, unique: true })
  mobile_number: string;

  @Column({ type: 'text', nullable: true })
  full_name_encrypted: string;

  @Column({ type: 'text', nullable: true })
  email_encrypted: string;

  @Column({ type: 'enum', enum: Role, default: Role.BORROWER })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'text', nullable: true })
  fcm_token: string;

  @Column({ type: 'smallint', default: 0 })
  onboarding_step: number;

  @Column({ length: 20, nullable: true, unique: true })
  referral_code: string;

  @Column({ type: 'uuid', nullable: true })
  referred_by_id: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_by_id' })
  referred_by: UserEntity;

  @Column({ type: 'timestamptz', nullable: true })
  deletion_requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletion_scheduled_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date;

  @Column({ type: 'int', default: 0 })
  login_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
