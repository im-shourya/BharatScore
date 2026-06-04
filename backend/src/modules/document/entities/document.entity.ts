import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { DocType } from '../../../common/enums/doc-type.enum';

@Entity('documents')
@Index(['user_id', 'doc_type'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: DocType })
  doc_type: DocType;

  @Column({ type: 'text' })
  s3_key_encrypted: string;

  @Column({ length: 100 })
  s3_bucket: string;

  @Column({ length: 64 })
  file_hash: string;

  @Column({ type: 'int' })
  size_bytes: number;

  @Column({ length: 100 })
  mime_type: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier: UserEntity;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ length: 200, nullable: true })
  deletion_reason: string;

  @Column({ type: 'timestamptz', nullable: true })
  hard_delete_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  hard_deleted_at: Date;

  @Column({ type: 'smallint', default: 7 })
  retention_years: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  uploaded_at: Date;
}
