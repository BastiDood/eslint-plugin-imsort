import type { ESLint } from 'eslint';

import { sortImports } from './rule.ts';

export default {
  meta: {
    name: 'eslint-plugin-imsort',
    version: '0.1.0',
    namespace: 'imsort',
  },
  rules: { 'sort-imports': sortImports },
} satisfies ESLint.Plugin;
