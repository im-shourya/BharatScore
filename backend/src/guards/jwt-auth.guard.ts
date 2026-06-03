import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CacheService } from '../shared/cache/cache.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Run passport JWT validation
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    // Check token blacklist (for logged-out tokens)
    const request = context.switchToHttp().getRequest();
    const token = request.user;
    const jti = token?.jti;

    if (jti) {
      const isBlacklisted = await this.cacheService.get(
        CACHE_KEYS.BLACKLIST(jti),
      );
      if (isBlacklisted) throw new UnauthorizedException('TOKEN_BLACKLISTED');
    }

    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) throw new UnauthorizedException('INVALID_TOKEN');
    return user;
  }
}
