import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { KycStatus } from '../../../common/enums/kyc-status.enum';

@Entity('kyc_records')
@Index(['user_id'], { unique: true })
@Index(['verification_status'])
export class KycRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  user_id: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ length: 64, nullable: true })
  aadhaar_hash: string;

  @Column({ length: 64, nullable: true })
  pan_hash: string;

  @Column({ length: 300, nullable: true })
  digilocker_ref: string;

  @Column({ type: 'text', nullable: true })
  digilocker_access_token: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  verification_status: KycStatus;

  @Column({ length: 20, nullable: true })
  liveness_check_status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  face_match_score: number;

  @Column({ type: 'jsonb', nullable: true })
  extracted_data_encrypted: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  pan_verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  aadhaar_verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  liveness_verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
