/** Hono context variables set by middleware. */
export type AppEnv = {
  Variables: {
    requestId: string;
    userId: string;
    token: string;
  };
};
