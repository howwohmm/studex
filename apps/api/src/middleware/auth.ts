import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey, KeyInput } from 'jose';
import { TextEncoder } from 'node:util';
import type { ApiConfig } from '../lib/config.js';
import type { AppEnv } from '../env.js';
import { problem } from '../lib/problem.js';

export interface AuthDeps {
  getKey: JWTVerifyGetKey | KeyInput;
}

/** Build the JWKS/secret verifier for a config (unit tests inject a local set). */
export function authDeps(config: ApiConfig): AuthDeps {
  if (config.jwksUrl) return { getKey: createRemoteJWKSet(new URL(config.jwksUrl)) };
  if (config.jwtSecret) {
    // HS256 shared secret (local dev / legacy Supabase projects).
    return { getKey: new TextEncoder().encode(config.jwtSecret) };
  }
  throw new Error('auth: set SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET');
}

/**
 * Bearer <Supabase JWT> middleware: 401 auth.required when absent,
 * 401 auth.invalid when verification fails. Sets userId + token on the context.
 */
export function requireAuth(deps: AuthDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return problem(c, 401, 'auth.required');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const { payload } = await jwtVerify(token, deps.getKey);
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        return problem(c, 401, 'auth.invalid');
      }
      c.set('userId', payload.sub);
      c.set('token', token);
    } catch {
      return problem(c, 401, 'auth.invalid');
    }
    await next();
  });
}
