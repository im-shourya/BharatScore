import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('users')
@Index(['mobile_number'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15, unique: true })
  mobile_number: string;

  @Column({ length: 500, nullable: true })
  full_name_encrypted: string;

  @Column({ length: 500, nullable: true })
  email_encrypted: string;

  @Column({ type: 'enum', enum: Role, default: Role.BORROWER })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ length: 10, default: 'en' })
  locale: string;

  @Column({ length: 500, nullable: true })
  fcm_token: string;

  @Column({ default: 0 })
  onboarding_step: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
