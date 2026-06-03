import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `${method} ${url} ${context.switchToHttp().getResponse().statusCode} ${duration}ms${user?.sub ? ` [user:${user.sub}]` : ''}`,
        );
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        this.logger.error(
          `${method} ${url} ${err.status || 500} ${duration}ms - ${err.message}${user?.sub ? ` [user:${user.sub}]` : ''}`,
        );
        throw err;
      }),
    );
  }
}
