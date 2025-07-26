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

    it('should handle correctly ordered parent-relative and relative imports', () => {
      valid(`import { Component } from 'react';

import { utils } from '@/utils';

import { deep } from '../../deep';
import { config } from '../config';

import { helper } from './helper';
import { types } from './types';`);
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

    it('should fix parent-relative imports before relative imports', () => {
      invalid({
        code: `import { helper } from './helper';
import { config } from '../config';
import { Component } from 'react';
import { types } from './types';`,
        errors: 1,
        output: `import { Component } from 'react';

import { config } from '../config';

import { helper } from './helper';
import { types } from './types';`,
      });
    });

    it('should fix parent-relative imports by decreasing depth', () => {
      invalid({
        code: `import { helper } from './helper';
import { shallow } from '../shallow';
import { deep } from '../../deep';
import { test } from './helper/test';
import { deeper } from '../../../deeper';`,
        errors: 1,
        output: `import { deeper } from '../../../deeper';

import { deep } from '../../deep';

import { shallow } from '../shallow';

import { helper } from './helper';

import { test } from './helper/test';`,
      });
    });
  });

  describe('invalid cases - multiple identifiers within imports', () => {
    it('should detect unsorted identifiers within named imports', () => {
      invalid({
        code: `import { useState, useEffect, useCallback } from 'react';`,
        errors: 1,
      });
    });

    it('should fix unsorted identifiers within named imports', () => {
      invalid({
        code: `import { useState, useEffect, useCallback } from 'react';`,
        errors: 1,
        output: `import { useCallback, useEffect, useState } from 'react';`,
      });
    });

    it('should fix multiple imports with unsorted identifiers', () => {
      invalid({
        code: `import { readFile, writeFile, stat } from 'node:fs/promises';
import { useState, useEffect, useCallback } from 'react';
import { z, b, a } from './utils';`,
        errors: 1,
        output: `import { readFile, stat, writeFile } from 'node:fs/promises';

import { useCallback, useEffect, useState } from 'react';

import { a, b, z } from './utils';`,
      });
    });

    it('should fix unsorted identifiers in default + named imports', () => {
      invalid({
        code: `import React, { useState, useEffect, useCallback } from 'react';`,
        errors: 1,
        output: `import React, { useCallback, useEffect, useState } from 'react';`,
      });
    });

    it('should handle natural sorting with numbers', () => {
      invalid({
        code: `import { item10, item2, item1, item20 } from 'module';`,
        errors: 1,
        output: `import { item1, item2, item10, item20 } from 'module';`,
      });
    });

    it('should handle case-insensitive sorting', () => {
      invalid({
        code: `import { Zeus, alpha, Beta, charlie } from 'module';`,
        errors: 1,
        output: `import { alpha, Beta, charlie, Zeus } from 'module';`,
      });
    });

    it('should fix mixed import types with unsorted identifiers', () => {
      invalid({
        code: `import { helper } from './helper';
import React, { useState, useEffect, useCallback } from 'react';
import * as utils from './utils';
import { z, a, m } from '@/components';`,
        errors: 1,
        output: `import React, { useCallback, useEffect, useState } from 'react';

import { a, m, z } from '@/components';

import * as utils from './utils';
import { helper } from './helper';`,
      });
    });
  });

  describe('invalid cases - trailing comma behavior', () => {
    it('should not add trailing commas when original code does not use them', () => {
      invalid({
        code: `import { useState, useCallback } from 'react';`,
        errors: 1,
        output: `import { useCallback, useState } from 'react';`,
      });
    });

    it('should preserve trailing commas when original code uses them', () => {
      invalid({
        code: `import { useState, useCallback, } from 'react';`,
        errors: 1,
        output: `import { useCallback, useState, } from 'react';`,
      });
    });

    it('should handle mixed trailing comma styles consistently', () => {
      invalid({
        code: `import { useState, useCallback, } from 'react';
import { readFile, writeFile } from 'node:fs/promises';`,
        errors: 1,
        output: `import { readFile, writeFile } from 'node:fs/promises';

import { useCallback, useState, } from 'react';`,
      });
    });

    it('should not add trailing commas to single identifier imports', () => {
      invalid({
        code: `import { helper } from './helper';
import { useState } from 'react';`,
        errors: 1,
        output: `import { useState } from 'react';

import { helper } from './helper';`,
      });
    });

    it('should preserve trailing commas in default + named imports', () => {
      invalid({
        code: `import React, { useState, useCallback, } from 'react';`,
        errors: 1,
        output: `import React, { useCallback, useState, } from 'react';`,
      });
    });
  });

  describe('invalid cases - mixed single and multiple identifier imports', () => {
    it('should handle mix of single and multiple identifier imports', () => {
      invalid({
        code: `import { helper } from './helper';
import { useState, useEffect, useCallback } from 'react';
import { Component } from 'react';
import { util } from './util';`,
        errors: 1,
        output: `import { useCallback, useEffect, useState } from 'react';
import { Component } from 'react';

import { helper } from './helper';
import { util } from './util';`,
      });
    });

    it('should sort within groups while maintaining import order', () => {
      invalid({
        code: `import { z, a, m } from 'external';
import { single } from 'single-external';
import { c, b, a as aliased } from './relative';`,
        errors: 1,
        output: `import { single } from 'single-external';
import { a, m, z } from 'external';

import { a as aliased, b, c } from './relative';`,
      });
    });

    it('should handle imports with aliases correctly', () => {
      invalid({
        code: `import { z as zed, a as alpha, m as mike } from 'module';`,
        errors: 1,
        output: `import { a as alpha, m as mike, z as zed } from 'module';`,
      });
    });
  });

  describe('invalid cases - complex scenarios', () => {
    it('should handle deeply nested import groups with multiple identifiers', () => {
      invalid({
        code: `import { helper, util, config } from './helper';
import { useState, useCallback, useEffect } from 'react';
import { deep, shallow } from '../../utils';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { parent1, parent2 } from '../parent';`,
        errors: 1,
        output: `import { readFile, stat, writeFile } from 'node:fs/promises';

import { useCallback, useEffect, useState } from 'react';

import { deep, shallow } from '../../utils';

import { parent1, parent2 } from '../parent';

import { config, helper, util } from './helper';`,
      });
    });

    it('should handle very long identifier lists', () => {
      invalid({
        code: `import { z, y, x, w, v, u, t, s, r, q, p, o, n, m, l, k, j, i, h, g, f, e, d, c, b, a } from 'alphabet';`,
        errors: 1,
        output: `import { a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z } from 'alphabet';`,
      });
    });

    it('should maintain quote style consistency', () => {
      invalid({
        code: `import { useState, useCallback } from "react";
import { helper } from "./helper";`,
        errors: 1,
        output: `import { useCallback, useState } from "react";

import { helper } from "./helper";`,
      });
    });
  });
});
