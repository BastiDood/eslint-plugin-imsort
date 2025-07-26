import type { ESLint } from 'eslint';

import { sortImports } from './rule.js';

export default {
  rules: { 'imsort/sort-imports': sortImports },
} satisfies ESLint.Plugin;
