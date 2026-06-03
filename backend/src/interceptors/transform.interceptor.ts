import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: null;
  request_id: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const requestId = context.switchToHttp().getRequest().headers['x-request-id'] ?? uuidv4();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        error: null,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
