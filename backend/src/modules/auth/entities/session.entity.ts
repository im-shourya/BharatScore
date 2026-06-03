import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sessions')
@Index(['jwt_jti'], { unique: true })
@Index(['user_id', 'is_revoked'])
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ length: 200, unique: true })
  jwt_jti: string;

  @Column({ length: 300, nullable: true })
  refresh_token_hash: string;

  @Column({ length: 300, nullable: true })
  device_fingerprint: string;

  @Column({ length: 50, nullable: true })
  ip_address: string;

  @Column({ length: 200, nullable: true })
  user_agent: string;

  @Column({ default: false })
  is_revoked: boolean;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
