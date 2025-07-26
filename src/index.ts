import type { ESLint } from 'eslint';

import { sortImports } from './rule.js';

export default {
  meta: {
    name: 'eslint-plugin-imsort',
    version: '0.1.0',
    // @ts-expect-error - namespace is a valid property
    namespace: 'imsort',
  },
  rules: { 'imsort/sort-imports': sortImports },
} satisfies ESLint.Plugin;
