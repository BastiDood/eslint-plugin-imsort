import type { ESLint } from 'eslint';

import { sortImports } from './rule.ts';

export default {
  meta: {
    name: '@bastidood/eslint-plugin-imsort',
    version: '0.8.0',
    namespace: '@bastidood/imsort',
  },
  rules: { 'sort-imports': sortImports },
  configs: {
    all: {
      rules: {
        '@bastidood/imsort/sort-imports': 'error',
      },
    },
  },
} satisfies ESLint.Plugin;
