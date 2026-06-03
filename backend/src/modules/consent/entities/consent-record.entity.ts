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
import { DataSource } from '../../../common/enums/data-source.enum';
import { ConsentScope } from '../../../common/enums/consent-scope.enum';

@Entity('consent_records')
@Index(['user_id', 'data_source', 'is_active'])
export class ConsentRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: DataSource })
  data_source: DataSource;

  @Column({ type: 'enum', enum: ConsentScope, default: ConsentScope.READ })
  scope: ConsentScope;

  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 200, nullable: true })
  aa_handle: string;

  @Column({ length: 300, nullable: true })
  aa_consent_id: string;

  @Column({ length: 100, nullable: true })
  aa_fip_id: string;

  @Column({ length: 50, default: 'CREDIT_SCORING' })
  purpose_code: string;

  @Column({ type: 'text', nullable: true })
  purpose_text: string;

  @Column({ length: 128 })
  consent_hash: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  granted_at: Date;

  @Column({ type: 'timestamptz' })
  valid_until: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  data_deletion_scheduled_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  data_deleted_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
