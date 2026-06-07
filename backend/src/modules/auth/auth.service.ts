import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { CacheService } from '../../shared/cache/cache.service';
import { CACHE_KEYS } from '../../common/constants/cache-keys';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UserEntity } from '../user/entities/user.entity';
import { UserStatus } from '../../common/enums/user-status.enum';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly config: ConfigService,
  ) {}

  // ── Send OTP ────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; expires_in: number }> {
    // Check if the mobile is locked (too many failed attempts)
    const lockKey = CACHE_KEYS.OTP_LOCK(dto.mobile);
    const isLocked = await this.cacheService.get(lockKey);
    if (isLocked) {
      const lockedUntil = await this.cacheService.getTtl(lockKey);
      throw new HttpException(
        { code: 'OTP_LOCKED', retry_after: lockedUntil },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate a 6-digit OTP
    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp, dto.mobile);
    const ttl = this.config.get<number>('OTP_TTL_SECONDS') || 300;

    // Store OTP hash and reset attempts
    await this.cacheService.set(CACHE_KEYS.OTP(dto.mobile), otpHash, ttl);
    await this.cacheService.set(CACHE_KEYS.OTP_ATTEMPTS(dto.mobile), 0, ttl);

    // In development, log the OTP. In production, this would call UIDAI API.
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.warn(`🔑 [DEV OTP] Mobile: ${dto.mobile} → OTP: ${otp}`);
    } else {
      // TODO: Integrate with UIDAI OTP gateway
      // await this.uidaiService.sendOtp(dto.mobile, otp);
      this.logger.log(`OTP sent to ${dto.mobile.replace(/.(?=.{4})/g, '*')}`);
    }

    return {
      message: `OTP sent to ${dto.mobile.replace(/.(?=.{4})/g, '*')}`,
      expires_in: ttl,
    };
  }

  // ── Verify OTP ──────────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto, ip: string, userAgent: string) {
    // Check if OTP exists (not expired)
    const storedHash = await this.cacheService.get<string>(CACHE_KEYS.OTP(dto.mobile));
    if (!storedHash) {
      throw new UnauthorizedException({ code: 'OTP_EXPIRED', message: 'OTP has expired' });
    }

    // Check attempt count
    const attempts = await this.cacheService.increment(CACHE_KEYS.OTP_ATTEMPTS(dto.mobile));
    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS') || 5;

    if (attempts > maxAttempts) {
      // Lock the account
      await this.cacheService.set(
        CACHE_KEYS.OTP_LOCK(dto.mobile),
        1,
        this.config.get<number>('OTP_LOCKOUT_SECONDS') || 1800,
      );
      await this.cacheService.del(CACHE_KEYS.OTP(dto.mobile));
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked due to too many failed attempts',
          locked_until: new Date(Date.now() + 1800000),
        },
        HttpStatus.LOCKED,
      );
    }

    // Verify OTP hash
    const expectedHash = this.hashOtp(dto.otp, dto.mobile);
    if (storedHash !== expectedHash) {
      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        message: 'Invalid OTP',
        attempts_remaining: maxAttempts - attempts,
      });
    }

    // OTP verified — clean up
    await this.cacheService.del(CACHE_KEYS.OTP(dto.mobile));
    await this.cacheService.del(CACHE_KEYS.OTP_ATTEMPTS(dto.mobile));

    // Find or create user
    let user = await this.authRepository.findUserByMobile(dto.mobile);
    const isNewUser = !user;

    if (!user) {
      user = await this.authRepository.createUser({
        mobile_number: dto.mobile,
        status: UserStatus.ACTIVE,
        locale: 'en',
      });
      this.logger.log(`New user created: ${user.id}`);
    }

    // Update FCM token if provided
    if (dto.fcm_token) {
      await this.authRepository.updateUser(user.id, { fcm_token: dto.fcm_token });
    }

    // Issue token pair
    const { accessToken, refreshToken, jti } = await this.issueTokenPair(user);

    // Create session record
    await this.authRepository.createSession({
      user_id: user.id,
      jwt_jti: jti,
      refresh_token: refreshToken,
      device_fingerprint: dto.device_fingerprint,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
      user: this.mapUserResponse(user),
      is_new_user: isNewUser,
      message: isNewUser ? 'Welcome to CredSaathi!' : 'Welcome back!',
    };
  }

  // ── Refresh Token ───────────────────────────────────────────

  async refresh(refreshToken: string) {
    const session = await this.authRepository.findSessionByRefreshToken(refreshToken);

    if (!session || session.is_revoked || session.expires_at < new Date()) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }

    const user = await this.authRepository.findUserById(session.user_id);
    if (!user) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }

    // Rotate tokens: revoke old session, create new one
    const { accessToken, refreshToken: newRefresh, jti } = await this.issueTokenPair(user);

    await this.authRepository.revokeSession(session.id);
    await this.authRepository.createSession({
      user_id: user.id,
      jwt_jti: jti,
      refresh_token: newRefresh,
      device_fingerprint: session.device_fingerprint,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      access_token: accessToken,
      refresh_token: newRefresh,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }

  // ── Logout ──────────────────────────────────────────────────

  async logout(jti: string, userId: string) {
    // Blacklist the current access token for its remaining TTL
    const ttl = 900; // 15 minutes (max token lifetime)
    await this.cacheService.set(CACHE_KEYS.BLACKLIST(jti), 1, ttl);

    // Revoke the session in DB
    await this.authRepository.revokeSessionByJti(jti);

    return { message: 'Logged out successfully' };
  }

  // ── Logout All Sessions ─────────────────────────────────────

  async logoutAll(userId: string) {
    const count = await this.authRepository.revokeAllUserSessions(userId);
    return { sessions_revoked: count };
  }

  // ── Get Current User ────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_FOUND' });
    }

    const activeSessions = await this.authRepository.getActiveSessionCount(userId);

    return {
      ...this.mapUserResponse(user),
      active_sessions: activeSessions,
    };
  }

  // ── Private helpers ─────────────────────────────────────────

  private async issueTokenPair(user: UserEntity) {
    const jti = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      jti,
      role: user.role,
      locale: user.locale,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return { accessToken, refreshToken, jti };
  }

  private generateOtp(): string {
    if (this.config.get('NODE_ENV') !== 'production') {
      return '123456';
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOtp(otp: string, mobile: string): string {
    const key = this.config.get<string>('ENCRYPTION_KEY') || 'dev-key';
    return crypto
      .createHmac('sha256', key)
      .update(`${otp}:${mobile}`)
      .digest('hex');
  }

  private mapUserResponse(user: UserEntity) {
    return {
      id: user.id,
      mobile: user.mobile_number.replace(/.(?=.{4})/g, '*'),
      role: user.role,
      status: user.status,
      locale: user.locale,
      onboarding_step: user.onboarding_step,
      created_at: user.created_at,
    };
  }
}
