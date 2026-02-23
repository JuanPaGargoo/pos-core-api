import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

/**
 * Global exception filter that formats all errors with the standard shape:
 * { error: { code, message, details } }
 *
 * Handles:
 * - HttpException (400, 401, 403, 404, 422, 429, etc.)
 * - Unhandled errors → 500 Internal Server Error
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: string;
    let message: string;
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.statusToCode(status);
      } else if (typeof exceptionResponse === 'object') {
        const obj = exceptionResponse as Record<string, unknown>;

        // class-validator puts messages in the `message` array
        if (Array.isArray(obj['message'])) {
          message = 'Validation failed';
          details = obj['message'] as unknown[];
        } else {
          message = (obj['message'] as string) ?? exception.message;
        }

        code = (obj['error'] as string) ?? this.statusToCode(status);
      } else {
        message = exception.message;
        code = this.statusToCode(status);
      }
    } else {
      // Unexpected error — log it and return 500
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );

      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected error occurred';
    }

    const body: ErrorResponse = {
      error: {
        code: this.toSnakeUpperCase(code),
        message,
        details,
      },
    };

    response.status(status).json(body);
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? `HTTP_${status}`;
  }

  private toSnakeUpperCase(str: string): string {
    return str
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')
      .toUpperCase();
  }
}
