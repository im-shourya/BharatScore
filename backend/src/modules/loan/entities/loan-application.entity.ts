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
import { UserEntity } from '../../user/entities/user.entity';
import { CreditScoreEntity } from '../../scoring/entities/credit-score.entity';
import { LoanState } from '../../../common/enums/loan-state.enum';
import { LoanPurpose } from '../../../common/enums/loan-purpose.enum';

@Entity('loan_applications')
@Index(['user_id', 'state'])
@Index(['lender_id', 'state', 'applied_at'])
export class LoanApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  score_id: string;

  @ManyToOne(() => CreditScoreEntity, { nullable: true })
  @JoinColumn({ name: 'score_id' })
  score: CreditScoreEntity;

  @Column({ type: 'uuid', nullable: true })
  lender_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'lender_id' })
  lender: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  second_approver_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'second_approver_id' })
  second_approver: UserEntity;

  @Column({ type: 'bigint' })
  amount_requested: number;

  @Column({ type: 'bigint', nullable: true })
  amount_approved: number;

  @Column({ type: 'smallint' })
  tenure_months: number;

  @Column({ type: 'enum', enum: LoanPurpose })
  purpose: LoanPurpose;

  @Column({ type: 'text', nullable: true })
  purpose_description: string;

  @Column({ type: 'enum', enum: LoanState, default: LoanState.DRAFT })
  state: LoanState;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  interest_rate: number;

  @Column({ type: 'bigint', default: 0 })
  processing_fee: number;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ length: 50, nullable: true })
  rejection_code: string;

  @Column({ type: 'text', nullable: true })
  disbursement_account: string;

  @Column({ length: 50, nullable: true })
  disbursement_utr: string;

  @Column({ type: 'timestamptz', nullable: true })
  applied_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  decided_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  disbursed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dpd_90_triggered_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
