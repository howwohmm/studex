import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { configFromEnv } from './lib/config.js';
import { logger } from './lib/log.js';

const config = configFromEnv();
const app = createApp(config);

serve({ fetch: app.fetch, port: config.port ?? 8080 }, (info) => {
  logger.info({ port: info.port }, 'studex-api listening');
});
