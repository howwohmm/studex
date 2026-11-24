import { pino } from 'pino';

/** Structured JSON logger. Never log request bodies, tokens or user content. */
export const logger = pino({ name: 'studex-api', level: process.env.LOG_LEVEL ?? 'info' });
