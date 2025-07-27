import tsParser from '@typescript-eslint/parser';
import { createRuleTester } from 'eslint-vitest-rule-tester';
import { describe, it } from 'vitest';

import { sortImports } from './rule.js';

describe('imsort/sort-imports - mixed type circular fix', () => {
  const { valid, invalid } = createRuleTester({
    name: 'sort-imports',
    rule: sortImports,
    configs: {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: tsParser,
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    },
  });

  describe('mixed type imports', () => {
    it('should handle single mixed type import without circular fixes', () => {
      invalid({
        code: `import { customType, type CustomTypeValues } from 'drizzle-orm/pg-core';`,
        errors: 1,
        output: `import { type CustomTypeValues, customType } from 'drizzle-orm/pg-core';`,
      });
    });

    it('should handle mixed type imports without circular fixes', () => {
      valid(`import assert from 'node:assert/strict';

import { type CustomTypeValues, customType } from 'drizzle-orm/pg-core';

interface Config extends CustomTypeValues {
  data: Buffer;
  config: undefined;
}`);
    });

    it('should handle mixed type imports with reordering', () => {
      invalid({
        code: `import { type CustomTypeValues, customType } from 'drizzle-orm/pg-core';
import assert from 'node:assert/strict';`,
        errors: 1,
        output: `import assert from 'node:assert/strict';

import { type CustomTypeValues, customType } from 'drizzle-orm/pg-core';`,
      });
    });

    it('should handle already correctly sorted mixed type imports', () => {
      valid(`import assert from 'node:assert/strict';

import { type CustomTypeValues, customType } from 'drizzle-orm/pg-core';`);
    });
  });
});
