export function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  let Redis: any;
  try {
    Redis = require('ioredis');
  } catch {
    return null;
  }
  const connectTimeout = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000);
  const maxRetriesPerRequest = Number(process.env.REDIS_MAX_RETRIES_PER_REQUEST || 2);

  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout,
    maxRetriesPerRequest,
  });

  client.connect().catch(() => null);
  return client;
}
