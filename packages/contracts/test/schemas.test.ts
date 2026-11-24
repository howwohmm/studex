import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  ErrorCodeSchema,
  ProblemSchema,
  HealthSchema,
  ProfileSchema,
  FlagsSchema,
  EntitlementsSchema,
  FREE_ENTITLEMENTS,
  DeviceRegistrationSchema,
  DeviceSchema,
} from '../src/index.js';

describe('error codes', () => {
  it('all codes are kebab-dot names and round-trip the schema', () => {
    for (const code of ERROR_CODES) {
      expect(code).toMatch(/^[a-z_]+(\.[a-z_]+)+$|^internal$|^not_found$/);
      expect(ErrorCodeSchema.parse(code)).toBe(code);
    }
    expect(ErrorCodeSchema.safeParse('bogus.code').success).toBe(false);
  });
});

describe('schemas', () => {
  it('Problem carries a stable code and RFC 9457 fields', () => {
    const p = ProblemSchema.parse({
      title: 'Not found',
      status: 404,
      code: 'not_found',
      detail: 'missing',
    });
    expect(p.type).toBe('about:blank');
    expect(p.code).toBe('not_found');
  });

  it('free-tier entitlements satisfy the schema', () => {
    expect(EntitlementsSchema.parse(FREE_ENTITLEMENTS).plan).toBe('free');
  });

  it('device registration validates platform and token', () => {
    expect(DeviceRegistrationSchema.safeParse({ platform: 'ios', push_token: 'x' }).success).toBe(
      true,
    );
    expect(DeviceRegistrationSchema.safeParse({ platform: 'nokia', push_token: 'x' }).success).toBe(
      false,
    );
  });

  it('stored devices allow null optional columns', () => {
    expect(
      DeviceSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        platform: 'web',
        push_token: 'x',
        app_version: null,
        os_version: null,
      }).success,
    ).toBe(true);
  });

  it('health/flags/profile shapes stay stable', () => {
    expect(HealthSchema.parse({ status: 'ok', uptime_s: 1.5 }).status).toBe('ok');
    expect(FlagsSchema.parse({ flags: { f: { enabled: true } } }).flags.f).toBeTruthy();
    expect(
      ProfileSchema.safeParse({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        display_name: null,
        avatar_path: null,
        institution_id: null,
        campus_id: null,
        program_id: null,
        department_id: null,
        year_of_study: null,
        current_term_id: null,
        timezone: 'Asia/Kolkata',
        locale: null,
        adult_confirmed: false,
      }).success,
    ).toBe(true);
  });
});
