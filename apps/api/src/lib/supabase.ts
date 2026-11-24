import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ApiConfig } from './config.js';

/** Per-request client carrying the caller's JWT — RLS applies as that user.
 *  With an empty token it acts as the anon role (no Authorization header). */
export function userClient(config: ApiConfig, token: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client for server-authoritative tables (idempotency, rate limits, entitlements). */
export function serviceClient(config: ApiConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
