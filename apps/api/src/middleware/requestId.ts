import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';
import type { AppEnv } from '../env.js';

/** Accepts or generates X-Request-Id, echoes it back on every response. */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  c.set('requestId', id);
  await next();
  c.header('x-request-id', id);
});
