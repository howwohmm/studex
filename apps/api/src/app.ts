import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { ZodError } from 'zod';
import type { ApiConfig } from './lib/config.js';
import type { AppEnv } from './env.js';
import { problem } from './lib/problem.js';
import { logger } from './lib/log.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';
import { requireAuth, authDeps, type AuthDeps } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { userClient, serviceClient } from './lib/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerHealth } from './modules/health.js';
import { registerMe } from './modules/me.js';
import { registerFlags } from './modules/flags.js';
import { registerEntitlements } from './modules/entitlements.js';
import { registerDevices } from './modules/devices.js';

export interface AppDeps {
  auth?: AuthDeps;
  svc?: () => SupabaseClient;
  userDb?: (c: Context<AppEnv>) => SupabaseClient;
}

export function createApp(config: ApiConfig, deps?: AppDeps) {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return problem(c, 422, 'validation.failed', result.error.issues[0]?.message);
      }
      return undefined;
    },
  });

  const auth = deps?.auth ?? authDeps(config);
  const svc = deps?.svc ?? (() => serviceClient(config));
  const authed = requireAuth(auth);

  app.use(requestId);
  app.use(requestLogger);
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return problem(c, 422, 'validation.failed', err.issues[0]?.message);
    }
    logger.error({ requestId: c.get('requestId'), err: String(err) });
    return problem(c, 500, 'internal');
  });
  app.notFound((c) => problem(c, 404, 'not_found'));

  registerHealth(app);
  registerFlags(app, () => userClient(config, ''));

  const userDb = deps?.userDb ?? ((c: Context<AppEnv>) => userClient(config, c.get('token')));

  app.use('/v1/me', authed);
  app.use('/v1/entitlements', authed);
  app.use('/v1/devices', authed, rateLimit(svc, config, '/v1/devices'));

  registerMe(app, userDb);
  registerEntitlements(app, svc);
  registerDevices(app, userDb, svc);

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });
  app.doc('/v1/openapi.json', {
    openapi: '3.0.0',
    info: { title: 'Studex API', version: '0.1.0' },
  });

  return app;
}
