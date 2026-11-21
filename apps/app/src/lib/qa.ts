// Dev routes are reachable in dev builds and in QA exports (EXPO_PUBLIC_QA=1
// is inlined at bundle time); production exports keep them gated off.
export const QA_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_QA === '1';
