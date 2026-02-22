import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'dist-electron', 'src/routeTree.gen.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Base rules (all files) ────────────────────────────────────────────
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Enforce zod/v4 — bare "zod" is the v3 API
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message: 'Import from "zod/v4" instead of "zod".',
            },
          ],
        },
      ],

      // Ban React.FC / React.FunctionComponent — use plain functions with typed props
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSTypeReference > Identifier[name="FC"]',
          message:
            'Do not use FC. Declare components as plain functions with typed props: function Foo(props: FooProps) {}',
        },
        {
          selector: 'TSTypeReference > TSQualifiedName[right.name="FC"]',
          message:
            'Do not use React.FC. Declare components as plain functions with typed props.',
        },
        {
          selector: 'TSTypeReference > Identifier[name="FunctionComponent"]',
          message:
            'Do not use FunctionComponent. Declare components as plain functions with typed props.',
        },
        {
          selector:
            'TSTypeReference > TSQualifiedName[right.name="FunctionComponent"]',
          message:
            'Do not use React.FunctionComponent. Declare components as plain functions with typed props.',
        },
      ],
    },
  },

  // ── Source files (renderer) ───────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/utils.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message: 'Import from "zod/v4" instead of "zod".',
            },
            {
              name: 'clsx',
              message:
                'Use cn() from "@/lib/utils" instead of importing clsx directly.',
            },
            {
              name: 'tailwind-merge',
              message:
                'Use cn() from "@/lib/utils" instead of importing tailwind-merge directly.',
            },
          ],
        },
      ],
    },
  },

  // ── Allow clsx + tailwind-merge in the cn() utility ───────────────────
  {
    files: ['src/lib/utils.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message: 'Import from "zod/v4" instead of "zod".',
            },
          ],
        },
      ],
    },
  },

  // ── Ban custom hooks wrapping React Query ─────────────────────────────
  // useQuery / useMutation must be called directly in components, never
  // wrapped in a custom hook. This keeps query keys colocated, avoids
  // unnecessary abstraction layers, and makes invalidation obvious.
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message: 'Import from "zod/v4" instead of "zod".',
            },
            {
              name: 'clsx',
              message: 'Use cn() from "@/lib/utils" instead.',
            },
            {
              name: 'tailwind-merge',
              message: 'Use cn() from "@/lib/utils" instead.',
            },
            {
              name: '@tanstack/react-query',
              importNames: [
                'useQuery',
                'useMutation',
                'useInfiniteQuery',
                'useSuspenseQuery',
              ],
              message:
                'Do not wrap React Query hooks in custom hooks. Use useQuery/useMutation directly in components with orpc.*.queryOptions().',
            },
            {
              name: '@orpc/tanstack-query',
              message:
                'Do not wrap oRPC query hooks in custom hooks. Use orpc.*.queryOptions() directly in components.',
            },
          ],
        },
      ],
    },
  },

  // ── Electron main process ─────────────────────────────────────────────
  // Use the logger from electron/logger — never console.*
  {
    files: ['electron/**/*.ts'],
    ignores: ['electron/lib/debug.ts', 'electron/logger/transports/console.ts'],
    rules: {
      'no-console': 'error',
    },
  },
)
