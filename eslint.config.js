import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'src/components/ui']),

  // Browser application code.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // Supabase edge functions run on Deno, not in a browser, and talk to an
  // untyped supabase-js client (no generated database types are checked in),
  // so the `any` rule would only be satisfied by fictional types.
  {
    files: ['supabase/functions/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.deno, EdgeRuntime: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Playwright specs and build config run under Node.
  {
    files: ['e2e/**/*.ts', '*.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
])
