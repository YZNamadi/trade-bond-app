import { getRequestContext } from './request-context';

type Level = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = (process.env.LOG_LEVEL as Level | undefined) || 'info';
const currentLevelValue = levelOrder[currentLevel] ?? 20;

function shouldLog(level: Level) {
  return (levelOrder[level] ?? 20) >= currentLevelValue;
}

function isoNow() {
  return new Date().toISOString();
}

function sanitize(fields: Record<string, unknown>) {
  const redactedKeys = new Set([
    'password',
    'jwt',
    'refresh_token',
    'refreshToken',
    'access_token',
    'accessToken',
    'accountNumber',
    'otp',
    'cookie',
    'authorization',
    'set-cookie',
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = redactedKeys.has(k) ? '[REDACTED]' : v;
  }
  return out;
}

export const baseLogger = {
  info(payload: Record<string, unknown>, _msg?: string) {
    if (!shouldLog('info')) return;
    console.log(JSON.stringify({ level: 'info', ts: isoNow(), service: 'trustytrade-backend', ...sanitize(payload) }));
  },
  warn(payload: Record<string, unknown>, _msg?: string) {
    if (!shouldLog('warn')) return;
    console.warn(JSON.stringify({ level: 'warn', ts: isoNow(), service: 'trustytrade-backend', ...sanitize(payload) }));
  },
  error(payload: Record<string, unknown>, _msg?: string) {
    if (!shouldLog('error')) return;
    console.error(JSON.stringify({ level: 'error', ts: isoNow(), service: 'trustytrade-backend', ...sanitize(payload) }));
  },
};

export function logInfo(event: string, fields?: Record<string, unknown>) {
  const ctx = getRequestContext();
  baseLogger.info(
    {
      event,
      requestId: ctx?.requestId,
      userId: ctx?.userId,
      method: ctx?.method,
      path: ctx?.path,
      ...fields,
    },
  );
}

export function logWarn(event: string, fields?: Record<string, unknown>) {
  const ctx = getRequestContext();
  baseLogger.warn(
    {
      event,
      requestId: ctx?.requestId,
      userId: ctx?.userId,
      method: ctx?.method,
      path: ctx?.path,
      ...fields,
    },
  );
}

export function logError(event: string, error: unknown, fields?: Record<string, unknown>) {
  const ctx = getRequestContext();
  baseLogger.error(
    {
      event,
      requestId: ctx?.requestId,
      userId: ctx?.userId,
      method: ctx?.method,
      path: ctx?.path,
      err: error instanceof Error ? { message: error.message, stack: error.stack, name: error.name } : error,
      ...fields,
    },
  );
}
