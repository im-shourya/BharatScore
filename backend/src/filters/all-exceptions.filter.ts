import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorBody =
      typeof errorResponse === 'string'
        ? { message: errorResponse }
        : (errorResponse as Record<string, any>);

    // Log 5xx errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: errorBody.code ?? errorBody.error ?? 'INTERNAL_ERROR',
        message: errorBody.message ?? 'Something went wrong',
        fields: errorBody.fields ?? null,
        status,
      },
      request_id: (request.headers['x-request-id'] as string) ?? uuidv4(),
      timestamp: new Date().toISOString(),
    });
  }
}
