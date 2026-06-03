import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use X-Forwarded-For if behind a proxy, otherwise use IP
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
