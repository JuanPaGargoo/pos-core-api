import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

/**
 * Global interceptor that automatically writes an AuditLog entry when
 * a route handler is decorated with @Audit(action, entity).
 *
 * Captures:
 * - userId    — from req.user.id (set by JwtAuthGuard)
 * - ip        — from req.ip
 * - userAgent — from req.headers['user-agent']
 * - entityId  — from route param :id (when present)
 * - message   — auto-generated from action + entity
 *
 * Only fires after a SUCCESSFUL response (tap, not catchError).
 * If the handler throws, no audit log is written by this interceptor.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<
      AuditMetadata | undefined
    >(AUDIT_KEY, [context.getHandler(), context.getClass()]);

    // No @Audit decorator — skip logging
    if (!metadata) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.user?.id;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const entityIdParam = req.params?.id ? Number(req.params.id) : undefined;

    // Capture the request body for the audit payload (strip sensitive fields)
    const SENSITIVE_KEYS = new Set([
      'password',
      'passwordHash',
      'refreshToken',
    ]);
    let requestBody: Record<string, unknown> | undefined;
    if (req.body && typeof req.body === 'object') {
      requestBody = Object.fromEntries(
        Object.entries(req.body as Record<string, unknown>).filter(
          ([key]) => !SENSITIVE_KEYS.has(key),
        ),
      );
    }

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        // Try to extract entityId from the response data if not in route params
        let entityId: number | undefined = entityIdParam;
        let branchId: number | undefined;

        if (responseBody && typeof responseBody === 'object') {
          const body = responseBody as Record<string, unknown>;
          const data = body['data'] as Record<string, unknown> | undefined;

          if (data && typeof data === 'object') {
            if (!entityId && 'id' in data) {
              entityId = data['id'] as number;
            }
            if ('branchId' in data) {
              branchId = data['branchId'] as number;
            }
          }
        }

        void this.auditLogsService.log({
          userId,
          branchId,
          action: metadata.action,
          entity: metadata.entity,
          entityId,
          message: `${metadata.action} on ${metadata.entity}${entityId ? ` #${entityId}` : ''}`,
          ip,
          userAgent,
          payload: requestBody,
        });
      }),
    );
  }
}
