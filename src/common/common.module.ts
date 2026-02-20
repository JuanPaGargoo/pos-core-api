import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Global module that provides shared guards, decorators, and utilities
 * available across the entire application.
 *
 * Exports:
 * - PermissionsGuard — RBAC guard, use with @RequirePermission() decorator
 */
@Global()
@Module({
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class CommonModule {}
