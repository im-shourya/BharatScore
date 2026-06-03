import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cms_loan_products')
export class CmsLoanProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  product_code: string;

  @Column({ type: 'jsonb' })
  name_json: Record<string, string>;

  @Column({ type: 'jsonb' })
  description_json: Record<string, string>;

  @Column({ type: 'bigint' })
  min_amount: number;

  @Column({ type: 'bigint' })
  max_amount: number;

  @Column({ type: 'smallint' })
  min_tenure_months: number;

  @Column({ type: 'smallint' })
  max_tenure_months: number;

  @Column({ type: 'decimal', precision: 6, scale: 3 })
  interest_rate_min: number;

  @Column({ type: 'decimal', precision: 6, scale: 3 })
  interest_rate_max: number;

  @Column({ type: 'decimal', precision: 5, scale: 3, default: 0 })
  processing_fee_pct: number;

  @Column({ type: 'text', array: true })
  eligible_risk_bands: string[];

  @Column({ type: 'int', default: 300 })
  min_score: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
