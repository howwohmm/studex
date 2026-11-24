export interface ApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  /** JWKS endpoint for Supabase Auth; falls back to HS256 jwtSecret when unset. */
  jwksUrl?: string;
  jwtSecret?: string;
  port?: number;
  /** Per-identity sliding window. */
  rateLimit: { windowMs: number; max: number };
  /** Behind a proxy: trust X-Forwarded-For for client IP. */
  trustProxy: boolean;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const supabaseUrl = env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
  return {
    supabaseUrl,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? '',
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    ...(env.SUPABASE_JWKS_URL
      ? { jwksUrl: env.SUPABASE_JWKS_URL }
      : { jwksUrl: `${supabaseUrl}/auth/v1/.well-known/jwks.json` }),
    ...(env.SUPABASE_JWT_SECRET ? { jwtSecret: env.SUPABASE_JWT_SECRET } : {}),
    port: Number(env.PORT ?? 8080),
    rateLimit: {
      windowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 60_000),
      max: Number(env.RATE_LIMIT_MAX ?? 20),
    },
    trustProxy: env.TRUST_PROXY === '1',
  };
}
