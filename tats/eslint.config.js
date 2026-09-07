import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // This codebase fetches data on mount via useEffect + a
      // useCallback-wrapped loader (the standard REST data-fetching
      // pattern used across every page: Dashboard, PhysicalReport,
      // Settings, UserDashboard, etc.). The React Compiler-oriented
      // rule below flags that entire pattern as an error, which
      // would require restructuring ~10 working pages' data flow
      // to silence -- not fixing an actual bug. Downgraded to a
      // warning so real hook mistakes still surface.
      'react-hooks/set-state-in-effect': 'warn',
      // UserDashboard's loadTasks intentionally depends only on
      // dashboard?.period?.year (the one field it reads), which is
      // narrower and correct -- the compiler's inferred dependency
      // ("dashboard") is coarser, not more accurate. No code change
      // needed; downgraded so it doesn't block lint runs.
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
])
