import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

/**
 * Decorator that marks a route handler as requiring a specific permission.
 * Used in combination with PermissionsGuard (after JwtAuthGuard).
 *
 * @example
 * @RequirePermission('users.create')
 * @Post()
 * create() { ... }
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
