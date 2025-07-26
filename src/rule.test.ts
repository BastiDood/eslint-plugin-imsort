import { createRuleTester } from 'eslint-vitest-rule-tester';
import { describe, it } from 'vitest';

import { sortImports } from './rule.js';

describe('imsort/sort-imports', () => {
  const { valid, invalid } = createRuleTester({
    name: 'sort-imports',
    rule: sortImports,
    configs: {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  });

  describe('valid cases', () => {
    it('should handle single import', () => {
      valid(`import { Component } from 'react';`);
    });

    it('should handle no imports', () => {
      valid(`const x = 1;`);
    });

    it('should handle already correctly sorted imports', () => {
      valid(`import { readFile } from 'node:fs/promises';

import { Component } from 'react';

import { utils } from '@/utils';

import { helper } from './helper';`);
    });

    it('should handle side-effect imports first', () => {
      valid(`import 'normalize.css';

import { Component } from 'react';

import { helper } from './helper';`);
    });
  });

  describe('invalid cases - detection', () => {
    it('should detect when imports need reordering', () => {
      invalid({
        code: `import { helper } from './helper';
import { Component } from 'react';`,
        errors: 1,
      });
    });

    it('should detect wrong group priority', () => {
      invalid({
        code: `import { helper } from './helper';
import { readFile } from 'node:fs/promises';
import { Component } from 'react';`,
        errors: 1,
      });
    });

    it('should detect unsorted imports within same group', () => {
      invalid({
        code: `import { z } from 'z-package';
import { a } from 'a-package';`,
        errors: 1,
      });
    });

    it('should detect mixed side-effect and regular imports', () => {
      invalid({
        code: `import { Component } from 'react';
import 'side-effect';`,
        errors: 1,
      });
    });
  });

  describe('invalid cases - autofix', () => {
    it('should fix basic import reordering', () => {
      invalid({
        code: `import { helper } from './helper';
import { Component } from 'react';`,
        errors: 1,
        output: `import { Component } from 'react';

import { helper } from './helper';`,
      });
    });

    it('should fix group priority sorting', () => {
      invalid({
        code: `import { helper } from './helper';
import { readFile } from 'node:fs/promises';
import { Component } from 'react';
import { utils } from '@/utils';`,
        errors: 1,
        output: `import { readFile } from 'node:fs/promises';

import { Component } from 'react';

import { utils } from '@/utils';

import { helper } from './helper';`,
      });
    });

    it('should fix side-effect imports positioning', () => {
      invalid({
        code: `import { Component } from 'react';
import 'side-effect';
import { helper } from './helper';`,
        errors: 1,
        output: `import 'side-effect';
import { Component } from 'react';

import { helper } from './helper';`,
      });
    });

    it('should fix complex import grouping', () => {
      invalid({
        code: `import { relative } from './relative';
import { aliased } from '@/aliased';
import { external } from 'external';
import { node } from 'node:fs';
import 'side-effect';`,
        errors: 1,
        output: `import { node } from 'node:fs';

import 'side-effect';
import { external } from 'external';

import { aliased } from '@/aliased';

import { relative } from './relative';`,
      });
    });

    it('should fix within-group sorting', () => {
      invalid({
        code: `import { zebra } from 'zebra';
import { alpha } from 'alpha';`,
        errors: 1,
        output: `import { alpha } from 'alpha';
import { zebra } from 'zebra';`,
      });
    });

    it('should handle different import types', () => {
      invalid({
        code: `import default2 from './default2';
import { named } from './named';
import * as namespace from './namespace';
import default1 from './default1';
import { Component } from 'react';`,
        errors: 1,
        output: `import { Component } from 'react';

import * as namespace from './namespace';
import default1 from './default1';
import default2 from './default2';
import { named } from './named';`,
      });
    });

    it('should preserve import formatting styles', () => {
      invalid({
        code: `import { b } from "./b";
import { a } from './a';
import {c} from 'react';`,
        errors: 1,
        output: `import { c } from 'react';

import { a } from './a';
import { b } from './b';`,
      });
    });

    it('should handle registry-namespaced imports', () => {
      invalid({
        code: `import { helper } from './helper';
import { component } from 'npm:@scope/package';
import { Component } from 'react';`,
        errors: 1,
        output: `import { component } from 'npm:@scope/package';

import { Component } from 'react';

import { helper } from './helper';`,
      });
    });

    it('should handle multiple side-effect imports', () => {
      invalid({
        code: `import { helper } from './helper';
import 'side-effect-2';
import { Component } from 'react';
import 'side-effect-1';`,
        errors: 1,
        output: `import 'side-effect-1';
import 'side-effect-2';
import { Component } from 'react';

import { helper } from './helper';`,
      });
    });
  });
});
