import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LoanApplicationEntity } from './loan-application.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { LoanState } from '../../../common/enums/loan-state.enum';

@Entity('loan_state_transitions')
@Index(['loan_id', 'transitioned_at'])
export class LoanStateTransitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loan_id: string;

  @ManyToOne(() => LoanApplicationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_id' })
  loan: LoanApplicationEntity;

  @Column({ type: 'uuid', nullable: true })
  actor_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: UserEntity;

  @Column({ type: 'enum', enum: LoanState })
  from_state: LoanState;

  @Column({ type: 'enum', enum: LoanState })
  to_state: LoanState;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  transitioned_at: Date;
}
