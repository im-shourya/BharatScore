import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from '../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  // ── User methods ────────────────────────────────────────────

  async findUserByMobile(mobile: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { mobile_number: mobile } });
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async updateUser(userId: string, data: Partial<UserEntity>): Promise<void> {
    await this.userRepo.update(userId, data);
  }

  // ── Session methods ─────────────────────────────────────────

  async createSession(data: {
    user_id: string;
    jwt_jti: string;
    refresh_token: string;
    device_fingerprint?: string;
    ip_address?: string;
    user_agent?: string;
    expires_at: Date;
  }): Promise<SessionEntity> {
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(data.refresh_token)
      .digest('hex');

    const session = this.sessionRepo.create({
      user_id: data.user_id,
      jwt_jti: data.jwt_jti,
      refresh_token_hash: refreshTokenHash,
      device_fingerprint: data.device_fingerprint,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      expires_at: data.expires_at,
    });
    return this.sessionRepo.save(session);
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<SessionEntity | null> {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    return this.sessionRepo.findOne({
      where: { refresh_token_hash: hash, is_revoked: false },
    });
  }

  async findSessionByJti(jti: string): Promise<SessionEntity | null> {
    return this.sessionRepo.findOne({ where: { jwt_jti: jti } });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { is_revoked: true });
  }

  async revokeSessionByJti(jti: string): Promise<void> {
    await this.sessionRepo.update({ jwt_jti: jti }, { is_revoked: true });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.sessionRepo.update(
      { user_id: userId, is_revoked: false },
      { is_revoked: true },
    );
    return result.affected ?? 0;
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    return this.sessionRepo.count({
      where: { user_id: userId, is_revoked: false },
    });
  }
}
