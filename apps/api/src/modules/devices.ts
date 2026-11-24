import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Context } from 'hono';
import { DeviceRegistrationSchema, DeviceSchema, type Device } from '@studex/contracts';
import type { AppEnv } from '../env.js';
import { problem } from '../lib/problem.js';
import { problemResponses } from '../lib/openapi.js';
import { checkIdempotency, hashRequest, storeIdempotency } from '../lib/idempotency.js';

export const devicesRoute = createRoute({
  method: 'post',
  path: '/v1/devices',
  tags: ['devices'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: DeviceRegistrationSchema } },
    },
  },
  responses: {
    200: {
      description: 'Registered device',
      content: { 'application/json': { schema: DeviceSchema } },
    },
    ...problemResponses(400, 401, 409, 422, 429, 500),
  },
});

export function registerDevices(
  app: OpenAPIHono<AppEnv>,
  userDbFor: (c: Context<AppEnv>) => SupabaseClient,
  svcFor: () => SupabaseClient,
) {
  app.openapi(devicesRoute, async (c) => {
    const userId = c.get('userId');
    const key = c.req.header('idempotency-key');
    if (!key) return problem(c, 400, 'idempotency.required');

    const body = c.req.valid('json');
    const requestHash = hashRequest(body);
    const svc = svcFor();

    const prior = await checkIdempotency(svc, userId, key, requestHash);
    if (prior.kind === 'replay') {
      c.header('x-idempotent-replay', 'true');
      return c.json(prior.body as Device, 200);
    }
    if (prior.kind === 'conflict') return problem(c, 409, 'idempotency.conflict');

    const { data, error } = await userDbFor(c)
      .from('devices')
      .insert({
        user_id: userId,
        platform: body.platform,
        push_token: body.push_token,
        app_version: body.app_version ?? null,
        os_version: body.os_version ?? null,
        last_seen_at: new Date().toISOString(),
      })
      .select('id, user_id, platform, push_token, app_version, os_version')
      .single();
    if (error) throw new Error(`devices insert failed: ${error.message}`);

    const device = DeviceSchema.parse(data);
    await storeIdempotency(svc, userId, key, requestHash, { status: 200, body: device });
    return c.json(device, 200);
  });
}
