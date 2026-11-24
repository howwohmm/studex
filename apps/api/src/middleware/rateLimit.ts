import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiConfig } from '../lib/config.js';
import { problem } from '../lib/problem.js';

function clientIp(trustProxy: boolean, c: Context): string {
  if (trustProxy) {
    const fwd = c.req.header('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]!.trim();
  }
  return 'unknown';
}

/**
 * Postgres-backed sliding window: one row per hit in rate_limit_hits; both the
 * per-user and per-IP identities must fit under the limit. Emits RateLimit-*.
 */
export function rateLimit(svcFor: () => SupabaseClient, config: ApiConfig, route: string) {
  const { windowMs, max } = config.rateLimit;
  return createMiddleware(async (c, next) => {
    const svc = svcFor();
    const userId = c.get('userId') as string | undefined;
    const identities = [
      ...(userId ? [`user:${userId}`] : []),
      `ip:${clientIp(config.trustProxy, c)}`,
    ];
    const since = new Date(Date.now() - windowMs).toISOString();

    for (const identity of identities) {
      const { count, error } = await svc
        .from('rate_limit_hits')
        .select('id', { count: 'exact', head: true })
        .eq('identity', identity)
        .eq('route', route)
        .gt('created_at', since);
      if (error) throw new Error(`rate limit check failed: ${error.message}`);
      const used = count ?? 0;
      c.header('RateLimit-Limit', String(max));
      c.header('RateLimit-Remaining', String(Math.max(0, max - used - 1)));
      c.header('RateLimit-Reset', String(Math.ceil((Date.now() + windowMs) / 1000)));
      if (used >= max) {
        c.header('Retry-After', String(Math.ceil(windowMs / 1000)));
        return problem(c, 429, 'rate_limit.exceeded');
      }
    }

    const { error: insertError } = await svc
      .from('rate_limit_hits')
      .insert(identities.map((identity) => ({ identity, route })));
    if (insertError) throw new Error(`rate limit write failed: ${insertError.message}`);
    await next();
  });
}
