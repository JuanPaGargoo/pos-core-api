import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * Global module that provides shared guards, decorators, and utilities
 * available across the entire application.
 *
 * Exports:
 * - PermissionsGuard — RBAC guard, use with @RequirePermission() decorator
 * - AuditInterceptor — global interceptor, fires for @Audit() decorated handlers
 */
@Global()
@Module({
  providers: [
    PermissionsGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [PermissionsGuard],
})
export class CommonModule {}
