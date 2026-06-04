import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LoanApplicationEntity } from './loan-application.entity';
import { EmiScheduleEntity } from './emi-schedule.entity';
import { PaymentMode } from '../../../common/enums/payment-mode.enum';

@Entity('repayment_events')
@Index(['loan_id', 'paid_at'])
@Index(['emi_id'])
export class RepaymentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loan_id: string;

  @ManyToOne(() => LoanApplicationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_id' })
  loan: LoanApplicationEntity;

  @Column('uuid')
  emi_id: string;

  @ManyToOne(() => EmiScheduleEntity)
  @JoinColumn({ name: 'emi_id' })
  emi: EmiScheduleEntity;

  @Column({ type: 'bigint' })
  amount_paid: number;

  @Column({ type: 'enum', enum: PaymentMode })
  payment_mode: PaymentMode;

  @Column({ length: 50, nullable: true, unique: true })
  utr_number: string;

  @Column({ length: 100, nullable: true })
  bank_reference: string;

  @Column({ type: 'int', default: 0 })
  days_late: number;

  @Column({ default: false })
  is_partial: boolean;

  @Column({ type: 'jsonb', nullable: true })
  bank_response: Record<string, any>;

  @Column({ default: false })
  reconciled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  reconciled_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  paid_at: Date;
}
