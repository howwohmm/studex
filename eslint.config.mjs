import expoConfig from 'eslint-config-expo/flat.js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/expo-env.d.ts',
      'extraction-lab/**',
    ],
  },
  // Expo app lint rules (react-native + import + core web) apply to the app tree.
  ...expoConfig.map((cfg) => ({ files: ['apps/app/**/*.{js,jsx,ts,tsx}'], ...cfg })),
  // typescript-eslint recommended for pure-TypeScript packages.
  ...tseslint.configs.recommended.map((cfg) => ({
    files: ['packages/**/*.{ts,tsx}'],
    ...cfg,
  })),
  {
    files: ['apps/app/**/*.{ts,tsx,js,jsx}'],
    rules: {
      // @studex/ai is server-only; app code must never import it (P0 import boundary).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@studex/ai', '@studex/ai/*'],
              message: '@studex/ai is server-only and must not be imported by the app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
