import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileSchema } from '@studex/contracts';
import type { AppEnv } from '../env.js';
import { problem } from '../lib/problem.js';
import { problemResponses } from '../lib/openapi.js';

export const meRoute = createRoute({
  method: 'get',
  path: '/v1/me',
  tags: ['me'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "The caller's profile",
      content: { 'application/json': { schema: ProfileSchema } },
    },
    ...problemResponses(401, 404, 500),
  },
});

export function registerMe(
  app: OpenAPIHono<AppEnv>,
  dbFor: (c: Context<AppEnv>) => SupabaseClient,
) {
  app.openapi(meRoute, async (c) => {
    const userId = c.get('userId');
    const db = dbFor(c);
    const { data, error } = await db
      .from('profiles')
      .select(
        'user_id, display_name, avatar_path, institution_id, campus_id, program_id, department_id, year_of_study, current_term_id, timezone, locale, adult_confirmed',
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(`profiles read failed: ${error.message}`);
    if (!data) return problem(c, 404, 'not_found', 'Profile not found');
    return c.json(ProfileSchema.parse(data), 200);
  });
}
