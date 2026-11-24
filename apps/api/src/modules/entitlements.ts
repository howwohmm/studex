import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EntitlementsSchema, FREE_ENTITLEMENTS } from '@studex/contracts';
import type { AppEnv } from '../env.js';
import { problemResponses } from '../lib/openapi.js';

export const entitlementsRoute = createRoute({
  method: 'get',
  path: '/v1/entitlements',
  tags: ['me'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'The caller\u2019s entitlements (free tier when no row exists)',
      content: { 'application/json': { schema: EntitlementsSchema } },
    },
    ...problemResponses(401, 500),
  },
});

export function registerEntitlements(app: OpenAPIHono<AppEnv>, svcFor: () => SupabaseClient) {
  app.openapi(entitlementsRoute, async (c) => {
    const userId = c.get('userId');
    const { data, error } = await svcFor()
      .from('entitlements')
      .select('plan, source, trial_ends_at, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`entitlements read failed: ${error.message}`);
    if (!data) return c.json(FREE_ENTITLEMENTS, 200);
    return c.json(EntitlementsSchema.parse(data), 200);
  });
}
