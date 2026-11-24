/**
 * Integration tests against a local Supabase (`supabase start`).
 * Requires env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 * SUPABASE_JWT_SECRET (from `supabase status -o env`). Skipped when unset.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { createApp } from '../src/app.js';
import { configFromEnv, type ApiConfig } from '../src/lib/config.js';
import { ProfileSchema } from '@studex/contracts';

const RUN = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
if (!RUN && process.env.REQUIRE_INTEGRATION === '1') {
  throw new Error(
    'REQUIRE_INTEGRATION=1 but SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY are not set',
  );
}
describe.skipIf(!RUN)('integration (local supabase)', () => {
  let config: ApiConfig;
  let svc: SupabaseClient;
  let app: ReturnType<typeof createApp>;
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;

  const req = (path: string, init?: RequestInit) =>
    app.request(`${config.supabaseUrl}${path}`, init);
  const authed = (token: string, init: RequestInit = {}) => ({
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });

  beforeAll(async () => {
    config = configFromEnv();
    // Local gotrue signs HS256 — verify with the shared secret unless a JWKS URL is explicit.
    if (process.env.SUPABASE_JWT_SECRET && !process.env.SUPABASE_JWKS_URL) {
      delete config.jwksUrl;
    }
    svc = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
    });
    app = createApp(config);

    const stamp = Date.now();
    for (const [i, name] of ['a', 'b'].entries()) {
      const email = `api-test-${name}-${stamp}@example.test`;
      const { data, error } = await svc.auth.admin.createUser({
        email,
        password: `test-pass-${stamp}-${i}`,
        email_confirm: true,
        user_metadata: { display_name: `Test ${name.toUpperCase()}` },
      });
      if (error) throw new Error(`createUser: ${error.message}`);
      const userId = data.user.id;
      // profiles row is created by the on_auth_user_created trigger.
      // Email sign-in is disabled in config.toml; mint the session JWT the way
      // gotrue would (HS256, aud/role 'authenticated') with the local secret.
      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
      const token = await new SignJWT({
        aud: 'authenticated',
        role: 'authenticated',
        email,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuer('supabase-demo')
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(secret);
      if (i === 0) {
        userA = userId;
        tokenA = token;
      } else {
        userB = userId;
        tokenB = token;
      }
    }
  });

  it('GET /v1/health is public', async () => {
    const res = await req('/v1/health');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('ok');
  });

  it("GET /v1/me returns the caller profile and not another user's", async () => {
    const resA = await req('/v1/me', authed(tokenA));
    expect(resA.status).toBe(200);
    const meA = ProfileSchema.parse(await resA.json());
    expect(meA.user_id).toBe(userA);
    expect(meA.display_name).toBe('Test A');

    const resB = await req('/v1/me', authed(tokenB));
    const meB = ProfileSchema.parse(await resB.json());
    expect(meB.user_id).toBe(userB);
    expect(meB.user_id).not.toBe(userA);
  });

  it('GET /v1/flags is publicly readable', async () => {
    const res = await req('/v1/flags');
    expect(res.status).toBe(200);
    expect((await res.json()) as object).toHaveProperty('flags');
  });

  it('GET /v1/entitlements returns defaults for a user with no row', async () => {
    const res = await req('/v1/entitlements', authed(tokenA));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { plan: string };
    expect(body.plan).toBe('free');
  });

  it('POST /v1/devices is idempotent: replay + conflict', async () => {
    const key = `it-${Date.now()}`;
    const body = { platform: 'web', push_token: 'tok-it', app_version: '0.1.0' };
    const first = await req(
      '/v1/devices',
      authed(tokenA, {
        method: 'post',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify(body),
      }),
    );
    expect(first.status).toBe(200);
    const device = (await first.json()) as { id: string; user_id: string };
    expect(device.user_id).toBe(userA);

    // Replay: same key, same body -> same row, replay header set.
    const replay = await req(
      '/v1/devices',
      authed(tokenA, {
        method: 'post',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify(body),
      }),
    );
    expect(replay.status).toBe(200);
    expect(replay.headers.get('x-idempotent-replay')).toBe('true');
    expect(((await replay.json()) as { id: string }).id).toBe(device.id);

    // Conflict: same key, different body.
    const conflict = await req(
      '/v1/devices',
      authed(tokenA, {
        method: 'post',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ platform: 'android', push_token: 'other' }),
      }),
    );
    expect(conflict.status).toBe(409);
    expect(((await conflict.json()) as { code: string }).code).toBe('idempotency.conflict');
  });

  it('POST /v1/devices requires Idempotency-Key', async () => {
    const res = await req(
      '/v1/devices',
      authed(tokenA, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: 'web', push_token: 'x' }),
      }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('idempotency.required');
  });
});
