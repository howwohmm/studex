import type { Context, TypedResponse } from 'hono';
import type { ErrorCode, Problem } from '@studex/contracts';
import type { AppEnv } from '../env.js';
import type { ProblemStatus } from './openapi.js';

const TITLES: Record<ErrorCode, string> = {
  'auth.required': 'Authentication required',
  'auth.invalid': 'Invalid credentials',
  'validation.failed': 'Validation failed',
  internal: 'Internal error',
  not_found: 'Not found',
  'idempotency.required': 'Idempotency-Key header required',
  'idempotency.conflict': 'Idempotency key reused with a different request',
  'rate_limit.exceeded': 'Rate limit exceeded',
  'attendance.invalid_tally': 'Invalid attendance tally',
  'quota.exceeded': 'Quota exceeded',
  'doc.too_large': 'Document too large',
};

/** Emit an RFC 9457 problem+json response with a stable `code`. */
export function problem<S extends ProblemStatus>(
  c: Context<AppEnv>,
  status: S,
  code: ErrorCode,
  detail?: string,
): Response & TypedResponse<Problem, S, 'json'> {
  const body: Problem = {
    type: 'about:blank',
    title: TITLES[code],
    status,
    code,
    ...(detail ? { detail } : {}),
    ...(c.get('requestId') ? { instance: c.get('requestId') } : {}),
  };
  return c.newResponse(JSON.stringify(body), status, {
    'content-type': 'application/problem+json',
  }) as Response & TypedResponse<Problem, S, 'json'>;
}
