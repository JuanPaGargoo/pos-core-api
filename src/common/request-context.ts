import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Datos que viajan con la petición HTTP en curso, accesibles desde
 * cualquier punto del stack sin pasarlos por parámetros (p. ej. la
 * extensión de auditoría de Prisma).
 */
export interface RequestStore {
  userId?: number;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

/** Id del usuario autenticado en la petición actual, si lo hay. */
export function getCurrentUserId(): number | undefined {
  return requestContext.getStore()?.userId;
}
