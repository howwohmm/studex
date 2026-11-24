import { z } from 'zod';

/** Stable machine-readable error codes (`code` on every problem+json body). */
export const ERROR_CODES = [
  'auth.required',
  'auth.invalid',
  'validation.failed',
  'internal',
  'not_found',
  'idempotency.required',
  'idempotency.conflict',
  'rate_limit.exceeded',
  'attendance.invalid_tally',
  'quota.exceeded',
  'doc.too_large',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export const ErrorCodeSchema = z.enum(ERROR_CODES);

/** RFC 9457 problem details, `application/problem+json`. */
export const ProblemSchema = z.object({
  type: z.string().default('about:blank'),
  title: z.string(),
  status: z.number().int(),
  code: ErrorCodeSchema,
  detail: z.string().optional(),
  instance: z.string().optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;

export const HealthSchema = z.object({
  status: z.literal('ok'),
  uptime_s: z.number(),
});
export type Health = z.infer<typeof HealthSchema>;

/** GET /v1/me — the caller's own profile row (RLS-enforced). */
export const ProfileSchema = z.object({
  user_id: z.uuid(),
  display_name: z.string().nullable(),
  avatar_path: z.string().nullable(),
  institution_id: z.uuid().nullable(),
  campus_id: z.uuid().nullable(),
  program_id: z.uuid().nullable(),
  department_id: z.uuid().nullable(),
  year_of_study: z.number().int().nullable(),
  current_term_id: z.uuid().nullable(),
  timezone: z.string(),
  locale: z.string().nullable(),
  adult_confirmed: z.boolean(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** GET /v1/flags — public feature flags. */
export const FlagsSchema = z.object({
  flags: z.record(z.string(), z.record(z.string(), z.unknown())),
});
export type Flags = z.infer<typeof FlagsSchema>;

/** GET /v1/entitlements — server-authoritative; free tier when no row. */
export const EntitlementsSchema = z.object({
  plan: z.string(),
  source: z.string().nullable(),
  trial_ends_at: z.iso.datetime().nullable(),
  expires_at: z.iso.datetime().nullable(),
});
export type Entitlements = z.infer<typeof EntitlementsSchema>;
export const FREE_ENTITLEMENTS: Entitlements = {
  plan: 'free',
  source: null,
  trial_ends_at: null,
  expires_at: null,
};

/** POST /v1/devices — push token registration. */
export const DeviceRegistrationSchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  push_token: z.string().min(1).max(512),
  app_version: z.string().max(64).optional(),
  os_version: z.string().max(64).optional(),
});
export type DeviceRegistration = z.infer<typeof DeviceRegistrationSchema>;

export const DeviceSchema = DeviceRegistrationSchema.extend({
  id: z.uuid(),
  user_id: z.uuid(),
  // Postgres returns null for unset columns; the request schema keeps them optional-only.
  app_version: z.string().max(64).nullish(),
  os_version: z.string().max(64).nullish(),
});
export type Device = z.infer<typeof DeviceSchema>;
