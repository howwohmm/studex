import type { SupabaseClient } from '@supabase/supabase-js';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { ApiConfig } from '../src/lib/config.js';
import type { AuthDeps } from '../src/middleware/auth.js';

export const TEST_CONFIG: ApiConfig = {
  supabaseUrl: 'http://127.0.0.1:9',
  supabaseAnonKey: 'anon',
  supabaseServiceKey: 'service',
  rateLimit: { windowMs: 60_000, max: 2 },
  trustProxy: false,
};

/** A PostgREST-style fluent stub: every call returns itself; awaiting yields `result`. */
function builder(result: unknown) {
  const self: unknown = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return () => self;
      },
    },
  );
  return self;
}

/**
 * Fake SupabaseClient: each `from(table)` call returns a chain that resolves to
 * the next queued result for that table (or `{ data: null, error: null }`).
 */
export function fakeClient(results: Record<string, unknown[]> = {}): SupabaseClient {
  return {
    from(table: string) {
      const queue = results[table] ?? [];
      const result = queue.length > 0 ? queue.shift() : { data: null, error: null };
      return builder(result);
    },
  } as unknown as SupabaseClient;
}

export interface TestKeys {
  auth: AuthDeps;
  sign: (
    sub: string,
    extra?: Record<string, unknown>,
    opts?: { expired?: boolean },
  ) => Promise<string>;
}

/** Generate an RS256 keypair + a local JWKS verifier + a signer. */
export async function testKeys(): Promise<TestKeys> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key';
  const auth: AuthDeps = { getKey: createLocalJWKSet({ keys: [jwk] }) };
  const sign = (
    sub: string,
    extra: Record<string, unknown> = {},
    opts: { expired?: boolean } = {},
  ) =>
    new SignJWT({ aud: 'authenticated', ...extra })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime(opts.expired ? '-1m' : '10m')
      .sign(privateKey);
  return { auth, sign };
}
