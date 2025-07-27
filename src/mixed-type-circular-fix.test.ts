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

    it('should not trigger autofix for already sorted identifiers', () => {
      valid(`import { type Config, helper, type User, value } from './types';`);
    });

    it('should not trigger autofix for single identifier imports', () => {
      valid(`import { type Config } from './types';`);
      valid(`import { helper } from './types';`);
      valid(`import type { Config } from './types';`);
    });

    it('should not trigger autofix for default imports', () => {
      valid(`import React from 'react';`);
      valid(`import type React from 'react';`);
    });

    it('should not trigger autofix for namespace imports', () => {
      valid(`import * as React from 'react';`);
      valid(`import type * as React from 'react';`);
    });

    it('should not trigger autofix for side-effect imports', () => {
      valid(`import './styles.css';`);
    });

    it('should not trigger autofix for already sorted complex mixed imports', () => {
      valid(`import {
  type BaseClass,
  type BaseClassInstance,
  baseClass,
  baseClassInstance,
  type Unrelated,
  unrelated,
  unrelatedClass
} from './types';`);
    });

    it('should not trigger autofix for natural number sorting', () => {
      valid(`import { item1, item2, item10, item20 } from './utils';`);
    });

    it('should not trigger autofix for case-sensitive sorting with uppercase precedence', () => {
      valid(`import {
  CustomTypeValues,
  customType,
  TypeHelper,
  typeHelper,
  UserConfig,
  userConfig
} from './types';`);
    });

    it('should not trigger autofix for mixed default and named imports when sorted', () => {
      valid(`import React, {
  type Component,
  useEffect,
  useState
} from 'react';`);
    });

    it('should not trigger autofix for multiple import groups when properly separated', () => {
      valid(`import assert from 'node:assert/strict';

import { type CustomTypeValues, customType } from 'drizzle-orm/pg-core';

import { type Config, helper } from './local';`);
    });

    it('should detect and fix unsorted identifiers without circular fixes', () => {
      invalid({
        code: `import { helper, type Config, value, type User } from './types';`,
        errors: 1,
        output: `import { type Config, helper, type User, value } from './types';`,
      });
    });

    it('should detect and fix unsorted default + named imports without circular fixes', () => {
      invalid({
        code: `import React, { useEffect, type Component, useState } from 'react';`,
        errors: 1,
        output: `import React, { type Component, useEffect, useState } from 'react';`,
      });
    });

    it('should detect and fix unsorted natural numbers without circular fixes', () => {
      invalid({
        code: `import { item10, item1, item20, item2 } from './utils';`,
        errors: 1,
        output: `import { item1, item2, item10, item20 } from './utils';`,
      });
    });

    it('should detect and fix unsorted case-sensitive identifiers without circular fixes', () => {
      invalid({
        code: `import { customType, CustomTypeValues, typeHelper, TypeHelper } from './types';`,
        errors: 1,
        output: `import { CustomTypeValues, customType, TypeHelper, typeHelper } from './types';`,
      });
    });

    it('should not trigger autofix for already sorted identifiers with same first letter', () => {
      valid(
        `import { BaseClass, BaseClassInstance, baseClass, baseClassInstance } from './types';`,
      );
    });

    it('should not trigger autofix for already sorted mixed type and value imports', () => {
      valid(`import { type Config, helper, type User, value } from './types';`);
    });

    it('should detect and fix unsorted mixed type and value imports without circular fixes', () => {
      invalid({
        code: `import { helper, type Config, value, type User } from './types';`,
        errors: 1,
        output: `import { type Config, helper, type User, value } from './types';`,
      });
    });

    // Tests specifically for circular fix prevention
    it('should not trigger autofix when identifiers are already sorted correctly', () => {
      valid(`import { type Config, helper, type User, value } from './types';`);
    });

    it('should not trigger autofix when default + named imports are already sorted', () => {
      valid(
        `import React, { type Component, useEffect, useState } from 'react';`,
      );
    });

    it('should not trigger autofix when natural numbers are already sorted', () => {
      valid(`import { item1, item2, item10, item20 } from './utils';`);
    });

    it('should not trigger autofix when case-sensitive identifiers are already sorted', () => {
      valid(
        `import { CustomTypeValues, customType, TypeHelper, typeHelper } from './types';`,
      );
    });

    // Test that the rule correctly identifies when no sorting is needed
    it('should not trigger autofix when identifiers are already sorted according to the rules', () => {
      valid(`import { type Config, helper, type User, value } from './types';`);
    });

    // Tests for handling identifiers that contain "type" in their names
    describe('identifiers containing "type" in names', () => {
      it('should not confuse "type" keyword with identifier containing "type"', () => {
        valid(`import { type types } from './types';`);
      });

      it('should handle statement-level type import with "types" identifier', () => {
        valid(`import type { types } from './types';`);
      });

      it('should handle mixed imports with "type" in identifier names', () => {
        valid(`import { typeHelper, types, typeWorld } from './types';`);
      });

      it('should handle mixed type imports with "type" in identifier names', () => {
        valid(
          `import { type Config, typeHelper, types, typeWorld } from './types';`,
        );
      });

      it('should handle default + named imports with "type" in identifier names', () => {
        valid(`import React, { typeHelper, types, typeWorld } from 'react';`);
      });

      it('should handle mixed default + named + type imports with "type" in names', () => {
        valid(
          `import React, { type Component, typeHelper, types, typeWorld } from 'react';`,
        );
      });

      it('should handle aliased imports with "type" in names', () => {
        valid(
          `import { types as TypeUtils, typeWorld as TypeWorldHelper } from './types';`,
        );
      });

      it('should handle mixed type imports with aliased "type" identifiers', () => {
        valid(
          `import { type Config, types as TypeUtils, typeWorld as TypeWorldHelper } from './types';`,
        );
      });

      it('should not trigger autofix for already sorted imports with "type" in names', () => {
        valid(
          `import { type Config, typeHelper, types, typeWorld } from './types';`,
        );
      });

      it('should detect and fix unsorted imports with "type" in names', () => {
        invalid({
          code: `import { typeWorld, type Config, typeHelper, types } from './types';`,
          errors: 1,
          output: `import { type Config, typeHelper, types, typeWorld } from './types';`,
        });
      });

      it('should handle complex mixed imports with "type" in names', () => {
        valid(`import {
  type Config,
  typeHelper,
  typeManager,
  types,
  typeUtils,
  typeWorld
} from './types';`);
      });

      it('should handle edge case with "type" as both keyword and identifier', () => {
        valid(`import { type type } from './types';`);
      });

      it('should handle edge case with "type" keyword and "type" identifier', () => {
        valid(`import { type type, typeHelper } from './types';`);
      });

      it('should handle statement-level type import with "type" identifier', () => {
        valid(`import type { type } from './types';`);
      });

      it('should handle mixed imports with "type" in various positions', () => {
        valid(`import {
  type,
  typeConfig,
  typeHelper,
  typeUtils,
  typeWorld
} from './types';`);
      });

      it('should detect and fix unsorted mixed imports with "type" in names', () => {
        invalid({
          code: `import { typeWorld, type Config, typeHelper, types, typeUtils } from './types';`,
          errors: 1,
          output: `import { type Config, typeHelper, types, typeUtils, typeWorld } from './types';`,
        });
      });

      it('should handle default + named imports with "type" in names when sorted', () => {
        valid(
          `import React, { type Component, typeHelper, types, typeWorld } from 'react';`,
        );
      });

      it('should detect and fix unsorted default + named imports with "type" in names', () => {
        invalid({
          code: `import React, { typeWorld, type Component, typeHelper, types } from 'react';`,
          errors: 1,
          output: `import React, { type Component, typeHelper, types, typeWorld } from 'react';`,
        });
      });
    });
  });
});
