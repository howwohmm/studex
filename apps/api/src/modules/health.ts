import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../env.js';
import { HealthSchema } from '@studex/contracts';

const startedAt = Date.now();

export const healthRoute = createRoute({
  method: 'get',
  path: '/v1/health',
  tags: ['platform'],
  responses: {
    200: {
      description: 'Service health',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

export function registerHealth(app: OpenAPIHono<AppEnv>) {
  app.openapi(healthRoute, (c) =>
    c.json({ status: 'ok' as const, uptime_s: (Date.now() - startedAt) / 1000 }, 200),
  );
}
