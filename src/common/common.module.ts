import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

/**
 * Global module that provides shared guards, interceptors and filters
 * available across the entire application via NestJS DI.
 *
 * - PermissionsGuard             — RBAC guard, use with @RequirePermission()
 * - AuditInterceptor             — fires for @Audit() decorated handlers
 * - TransformResponseInterceptor — wraps all responses in { data, meta }
 * - HttpExceptionFilter          — formats all errors as { error: { code, message, details } }
 */
@Global()
@Module({
  providers: [
    PermissionsGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [PermissionsGuard],
})
export class CommonModule {}
