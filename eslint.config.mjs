import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

// The flat config ESLint 9 requires. This is a direct translation of the old .eslintrc.json,
// which stopped being read when the project moved to ESLint 9 -- `npm run lint` had been
// erroring out rather than linting.
const config = [
  {
    ignores: ['.next/**', '.next-*/**', 'out/**', 'public/**', 'node_modules/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Turns off everything that would fight the Prettier config in .prettierrc.json.
  { rules: prettier.rules },
  {
    rules: {
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]

export default config
