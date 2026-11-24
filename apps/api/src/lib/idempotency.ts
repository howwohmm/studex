import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export function hashRequest(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('hex');
}

interface Stored {
  request_hash: string;
  response: { status: number; body: unknown };
}

/**
 * Look up a live (<24h) record for (user, key). Returns 'replay' with the stored
 * response, 'conflict' when the hash differs, or 'fresh' when nothing is stored.
 */
export async function checkIdempotency(
  svc: SupabaseClient,
  userId: string,
  key: string,
  requestHash: string,
): Promise<
  { kind: 'replay'; status: number; body: unknown } | { kind: 'conflict' } | { kind: 'fresh' }
> {
  const { data, error } = await svc
    .from('idempotency_keys')
    .select('request_hash, response')
    .eq('user_id', userId)
    .eq('key', key)
    .gt('created_at', new Date(Date.now() - WINDOW_MS).toISOString())
    .maybeSingle();
  if (error) throw new Error(`idempotency lookup failed: ${error.message}`);
  if (!data) return { kind: 'fresh' };
  const stored = data as Stored;
  if (stored.request_hash === requestHash) {
    return { kind: 'replay', status: stored.response.status, body: stored.response.body };
  }
  return { kind: 'conflict' };
}

/** Persist the response for a key; a unique-violation race just replays later. */
export async function storeIdempotency(
  svc: SupabaseClient,
  userId: string,
  key: string,
  requestHash: string,
  response: { status: number; body: unknown },
): Promise<void> {
  const { error } = await svc.from('idempotency_keys').insert({
    user_id: userId,
    key,
    request_hash: requestHash,
    response,
  });
  if (error && error.code !== '23505') {
    throw new Error(`idempotency store failed: ${error.message}`);
  }
}
