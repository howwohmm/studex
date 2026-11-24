import { describe, expect, it, beforeAll } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { createApp } from '../src/app.js';
import { TEST_CONFIG, fakeClient, testKeys, type TestKeys } from './helpers.js';

let keys: TestKeys;
beforeAll(async () => {
  keys = await testKeys();
});

describe('openapi document', () => {
  it('validates as an OpenAPI 3.x document', async () => {
    const app = createApp(TEST_CONFIG, { auth: keys.auth, svc: () => fakeClient() });
    const res = await app.request('http://x/v1/openapi.json');
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string };
    await SwaggerParser.validate(structuredClone(doc) as never);
    expect(doc.openapi).toMatch(/^3\./);
  });

  it('documents every route with request/response schemas', async () => {
    const app = createApp(TEST_CONFIG, { auth: keys.auth, svc: () => fakeClient() });
    const doc = (await (await app.request('http://x/v1/openapi.json')).json()) as {
      paths: Record<
        string,
        Record<string, { responses: Record<string, unknown>; requestBody?: unknown }>
      >;
    };
    expect(Object.keys(doc.paths).sort()).toEqual(
      ['/v1/devices', '/v1/entitlements', '/v1/flags', '/v1/health', '/v1/me'].sort(),
    );
    for (const [path, ops] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        expect(Object.keys(op.responses), `${method} ${path}`).not.toHaveLength(0);
        for (const [status, response] of Object.entries(op.responses)) {
          const content = (response as { content?: Record<string, { schema?: unknown }> }).content;
          expect(content, `${method} ${path} ${status} has a schema`).toBeTruthy();
          expect(
            Object.values(content!).every((c) => c.schema),
            `${method} ${path} ${status} every content type has a schema`,
          ).toBe(true);
        }
        if (method === 'post') expect(op.requestBody, `${method} ${path}`).toBeTruthy();
      }
    }
  });
});
