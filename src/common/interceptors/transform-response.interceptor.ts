import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

/**
 * Global interceptor that ensures every successful response follows the
 * standard format: { data: ..., meta: {} }.
 *
 * Controllers that already return { data, meta } are passed through as-is
 * to avoid double-wrapping.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T> | T
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T> | T> {
    return next.handle().pipe(
      map((response: unknown) => {
        // If the controller already returned the standard shape, pass through
        if (
          response !== null &&
          typeof response === 'object' &&
          'data' in (response as object)
        ) {
          return response as StandardResponse<T>;
        }

        // Otherwise wrap in standard format
        return {
          data: response as T,
          meta: {},
        };
      }),
    );
  }
}
