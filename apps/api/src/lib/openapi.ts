import { ProblemSchema } from '@studex/contracts';

export type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

type ProblemResponse = {
  description: string;
  content: { 'application/problem+json': { schema: typeof ProblemSchema } };
};

/** Standard problem+json error responses for route definitions. */
export function problemResponses<S extends ProblemStatus>(
  ...statuses: S[]
): Record<S, ProblemResponse> {
  const out = {} as Record<S, ProblemResponse>;
  for (const status of statuses) {
    out[status] = {
      description: 'Error',
      content: { 'application/problem+json': { schema: ProblemSchema } },
    };
  }
  return out;
}
