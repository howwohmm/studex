import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env.js';
import { logger } from '../lib/log.js';

/** One structured line per request: method, route, status, duration, request id. */
export const requestLogger = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  await next();
  logger.info({
    requestId: c.get('requestId'),
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    ms: Math.round(performance.now() - start),
  });
});
