import js from '@eslint/js';

export default [
  {
    // TS/Vue frontend under src/ is out of scope for this JS-only config —
    // it has no parser for .ts/.vue syntax. Linting it needs
    // typescript-eslint + eslint-plugin-vue, a separate setup.
    ignores: ['node_modules/**', 'dist/**', 'src/**', '*.config.ts'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        globalThis: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
