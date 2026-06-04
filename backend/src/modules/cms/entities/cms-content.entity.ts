import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('cms_content')
@Unique(['key', 'locale'])
@Index(['namespace', 'locale'])
export class CmsContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  key: string;

  @Column({ length: 10 })
  locale: string;

  @Column({ length: 50 })
  namespace: string;

  @Column({ type: 'jsonb' })
  content: Record<string, any>;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
