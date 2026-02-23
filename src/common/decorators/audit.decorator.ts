import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_metadata';

export interface AuditMetadata {
  action: string;
  entity: string;
}

/**
 * Decorator that marks a route handler for automatic audit logging.
 * The AuditInterceptor will fire after the handler resolves successfully,
 * capturing IP, User-Agent and user ID automatically.
 *
 * @example
 * @Audit('CREATE', 'Product')
 * @Post()
 * create() { ... }
 */
export const Audit = (action: string, entity: string) =>
  SetMetadata(AUDIT_KEY, { action, entity } satisfies AuditMetadata);
