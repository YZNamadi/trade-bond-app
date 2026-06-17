import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  userRole: string | null;
  path: string | null;
  method: string | null;
  startedAtMs: number;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}

export function setRequestUser(userId: string | null, userRole: string | null) {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.userId = userId;
  ctx.userRole = userRole;
}
