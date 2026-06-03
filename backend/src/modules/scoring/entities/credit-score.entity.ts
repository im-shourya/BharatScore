import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { RiskBand } from '../../../common/enums/risk-band.enum';

@Entity('credit_scores')
@Index(['user_id', 'generated_at'])
@Index(['risk_band', 'generated_at'])
@Index(['model_version', 'generated_at'])
export class CreditScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'enum', enum: RiskBand })
  risk_band: RiskBand;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  model1_pd: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  model2_risk: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  model3_stability: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  ensemble_pd: number;

  @Column({ type: 'jsonb', default: '[]' })
  shap_values: any[];

  @Column({ length: 20 })
  feature_version: string;

  @Column({ length: 30 })
  model_version: string;

  @Column({ type: 'jsonb', default: '{}' })
  data_completeness: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  features_snapshot: Record<string, any>;

  @Column({ default: true })
  is_valid: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  invalidated_at: Date;

  @Column({ type: 'text', nullable: true })
  invalidation_reason: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  generated_at: Date;
}
