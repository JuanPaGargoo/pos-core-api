import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { requestContext } from '../request-context';

/**
 * Abre un AsyncLocalStorage por petición y guarda el id del usuario
 * autenticado. Debe registrarse como el interceptor más externo para que
 * el contexto esté disponible durante toda la ejecución del handler
 * (incluida la extensión de auditoría de Prisma).
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { id?: number } }>();
    const userId = req?.user?.id;

    return new Observable((subscriber) => {
      requestContext.run({ userId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
