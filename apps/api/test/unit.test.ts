import { describe, expect, it, beforeAll } from 'vitest';
import { ProblemSchema } from '@studex/contracts';
import { createApp } from '../src/app.js';
import { hashRequest } from '../src/lib/idempotency.js';
import { TEST_CONFIG, fakeClient, testKeys, type TestKeys } from './helpers.js';

let keys: TestKeys;
beforeAll(async () => {
  keys = await testKeys();
});

const app = (
  svcResults: Record<string, unknown[]> = {},
  userDbResults: Record<string, unknown[]> = {},
) =>
  createApp(TEST_CONFIG, {
    auth: keys.auth,
    svc: () => fakeClient(svcResults),
    userDb: () => fakeClient(userDbResults),
  });

describe('request id', () => {
  it('echoes an incoming X-Request-Id', async () => {
    const res = await app().request('http://x/v1/health', { headers: { 'x-request-id': 'req-1' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('req-1');
  });

  it('generates one when absent', async () => {
    const res = await app().request('http://x/v1/health');
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('problem+json', () => {
  it('404 for unknown routes with a stable code', async () => {
    const res = await app().request('http://x/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = ProblemSchema.parse((await res.json()) as unknown);
    expect(body.code).toBe('not_found');
    expect(body.status).toBe(404);
  });
});

describe('auth', () => {
  it('401 auth.required without a bearer token', async () => {
    const res = await app().request('http://x/v1/me');
    const body = (await res.json()) as { code: string };
    expect(res.status).toBe(401);
    expect(body.code).toBe('auth.required');
  });

  it('401 auth.invalid for a malformed or unverifiable token', async () => {
    for (const token of ['garbage', (await keys.sign('u')) + 'x']) {
      const res = await app().request('http://x/v1/me', {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
      expect(((await res.json()) as { code: string }).code).toBe('auth.invalid');
    }
  });

  it('401 auth.invalid for an expired token', async () => {
    const token = await keys.sign('u', {}, { expired: true });
    const res = await app().request('http://x/v1/me', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe('auth.invalid');
  });
});

const SUB = '123e4567-e89b-12d3-a456-426614174000';

function postDevices(
  token: string,
  opts: {
    key?: string;
    body?: unknown;
    ip?: string;
    svc?: Record<string, unknown[]>;
    userDb?: Record<string, unknown[]>;
  } = {},
) {
  return app(opts.svc, opts.userDb).request('http://x/v1/devices', {
    method: 'post',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(opts.key ? { 'idempotency-key': opts.key } : {}),
      ...(opts.ip ? { 'x-forwarded-for': opts.ip } : {}),
    },
    body: JSON.stringify(opts.body ?? { platform: 'ios', push_token: 'tok' }),
  });
}

describe('validation', () => {
  it('422 validation.failed on a bad body', async () => {
    const token = await keys.sign(SUB);
    const res = await postDevices(token, {
      key: 'k1',
      body: { platform: 'nokia' },
      svc: {
        rate_limit_hits: [{ count: 0, error: null }, { count: 0, error: null }, { error: null }],
      },
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('validation.failed');
  });
});

describe('rate limit', () => {
  it('emits RateLimit-* headers and 429s when the window is full', async () => {
    const token = await keys.sign(SUB);
    const res = await postDevices(token, {
      key: 'k',
      svc: {
        rate_limit_hits: [{ count: 2, error: null }],
      },
    });
    expect(res.status).toBe(429);
    expect(((await res.json()) as { code: string }).code).toBe('rate_limit.exceeded');
    expect(res.headers.get('ratelimit-limit')).toBe('2');
    expect(res.headers.get('ratelimit-remaining')).toBe('0');
    expect(res.headers.get('retry-after')).toBeTruthy();
  });

  it('counts both user and ip identities', async () => {
    const token = await keys.sign(SUB);
    const res = await postDevices(token, {
      key: 'k',
      ip: '1.2.3.4',
      svc: {
        // user under limit, ip at limit (trustProxy off -> 'ip:unknown' still counted)
        rate_limit_hits: [
          { count: 0, error: null },
          { count: 2, error: null },
        ],
      },
    });
    expect(res.status).toBe(429);
  });
});

describe('idempotency', () => {
  const device = {
    id: '123e4567-e89b-12d3-a456-426614174999',
    user_id: SUB,
    platform: 'ios',
    push_token: 'tok',
  };

  it('400 idempotency.required without the header', async () => {
    const token = await keys.sign(SUB);
    const res = await postDevices(token, {
      svc: {
        rate_limit_hits: [{ count: 0, error: null }, { count: 0, error: null }, { error: null }],
      },
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('idempotency.required');
  });

  it('replays the stored response for same key + same body', async () => {
    const token = await keys.sign(SUB);
    const requestHash = hashRequest({ platform: 'ios', push_token: 'tok' });
    const res = await postDevices(token, {
      key: 'k1',
      svc: {
        rate_limit_hits: [{ count: 0, error: null }, { count: 0, error: null }, { error: null }],
        idempotency_keys: [
          {
            data: {
              request_hash: requestHash,
              response: { status: 200, body: device },
            },
            error: null,
          },
        ],
      },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-idempotent-replay')).toBe('true');
    expect(((await res.json()) as { id: string }).id).toBe(device.id);
  });

  it('409 idempotency.conflict for same key + different body', async () => {
    const token = await keys.sign(SUB);
    const res = await postDevices(token, {
      key: 'k1',
      svc: {
        rate_limit_hits: [{ count: 0, error: null }, { count: 0, error: null }, { error: null }],
        idempotency_keys: [
          {
            data: {
              request_hash: 'different-hash',
              response: { status: 200, body: device },
            },
            error: null,
          },
        ],
      },
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('idempotency.conflict');
  });

  it('fresh key inserts the device and stores the response', async () => {
    const token = await keys.sign(SUB);
    const res = await postDevices(token, {
      key: 'k2',
      svc: {
        rate_limit_hits: [{ count: 0, error: null }, { count: 0, error: null }, { error: null }],
        idempotency_keys: [{ data: null, error: null }, { error: null }],
      },
      userDb: { devices: [{ data: device, error: null }] },
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as object).toMatchObject({ id: device.id, platform: 'ios' });
  });
});
