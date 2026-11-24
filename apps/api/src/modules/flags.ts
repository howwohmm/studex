import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FlagsSchema } from '@studex/contracts';
import type { AppEnv } from '../env.js';
import { problemResponses } from '../lib/openapi.js';

export const flagsRoute = createRoute({
  method: 'get',
  path: '/v1/flags',
  tags: ['platform'],
  responses: {
    200: {
      description: 'Feature flags (public read)',
      content: { 'application/json': { schema: FlagsSchema } },
    },
    ...problemResponses(500),
  },
});

export function registerFlags(app: OpenAPIHono<AppEnv>, dbFor: () => SupabaseClient) {
  app.openapi(flagsRoute, async (c) => {
    const { data, error } = await dbFor().from('feature_flags').select('key, rules');
    if (error) throw new Error(`feature_flags read failed: ${error.message}`);
    const flags = Object.fromEntries((data ?? []).map((r) => [r.key as string, r.rules]));
    return c.json({ flags }, 200);
  });
}
