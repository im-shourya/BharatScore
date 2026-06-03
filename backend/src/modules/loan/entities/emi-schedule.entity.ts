import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { LoanApplicationEntity } from './loan-application.entity';
import { EmiStatus } from '../../../common/enums/emi-status.enum';

@Entity('emi_schedules')
@Unique(['loan_id', 'installment_number'])
@Index(['loan_id', 'installment_number'])
@Index(['due_date', 'status'])
export class EmiScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loan_id: string;

  @ManyToOne(() => LoanApplicationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_id' })
  loan: LoanApplicationEntity;

  @Column({ type: 'smallint' })
  installment_number: number;

  @Column({ type: 'bigint' })
  principal_amount: number;

  @Column({ type: 'bigint' })
  interest_amount: number;

  @Column({ type: 'bigint' })
  total_amount_due: number;

  @Column({ type: 'bigint', default: 0 })
  amount_paid: number;

  @Column({ type: 'bigint', nullable: true })
  outstanding_principal: number;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'enum', enum: EmiStatus, default: EmiStatus.PENDING })
  status: EmiStatus;

  @Column({ type: 'int', default: 0 })
  days_past_due: number;

  @Column({ type: 'bigint', default: 0 })
  late_fee: number;

  @Column({ type: 'bigint', default: 0 })
  waiver_amount: number;

  @Column({ type: 'text', nullable: true })
  waiver_reason: string;
}
