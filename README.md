# Imsort: Import Sort

An opinionated ESLint plugin for sorting and grouping imports automatically.

## Features

- **Automatic import sorting** within logical groups
- **Smart import grouping** based on import source patterns
- **Blank line separation** between different import groups
- **Preserves formatting preferences** (quotes, trailing commas, line length)
- **Zero configuration** - works out of the box with sensible defaults
- **Auto-fixable** - automatically sorts imports when running `eslint --fix`

## Installation

> [!CAUTION]
> This plugin conflicts with the built-in [`sort-imports`] rule.

[`sort-imports`]: https://eslint.org/docs/latest/rules/sort-imports

### ESLint Flat Config (recommended!)

Add the plugin to your `eslint.config.js`:

```js
import imsort from '@bastidood/eslint-plugin-imsort';

export default [
  {
    files: ['**/*.{j,t}s{,x}'],
    extends: [imsort.configs.all],
    plugins: { '@bastidood/imsort': imsort },
  },
];
```

## Import Groups

The plugin organizes imports into the following groups, in order:

1. **Runtime-namespaced imports** (`node:`, `bun:`, `deno:`, `cloudflare:`)

   ```js
   import fs from 'node:fs';
   import path from 'node:path';
   ```

2. **Registry-namespaced imports** (`npm:`, `jsr:`, `esm:`, `unpkg:`, `cdn:`)

   ```js
   import lodash from 'npm:lodash';
   import react from 'jsr:@react/core';
   ```

3. **Generic namespaced imports** (any `namespace:` pattern)

   ```js
   import config from 'app:config';
   import utils from 'shared:utils';
   ```

4. **Third-party packages** (bare imports from `node_modules`)

   ```js
   import type { Config } from '@types/config';
   import express from 'express';
   import React from 'react';
   import { useState } from 'react';
   ```

5. **Custom-aliased imports with $ and ~ prefixes** (`$lib/*`, `$app/*`, `~shared/*`, etc.)

   ```js
   import shared from '~shared/types';
   import { database } from '$lib/server/database';
   import { stores } from '$app/stores';
   ```

6. **Custom-aliased imports with @/ and ~/ prefixes** (`@/utils`, `~/config`, etc.)

   ```js
   import config from '~/config';
   import { utils } from '@/utils';
   import { components } from '@/components/Button';
   ```

7. **Relative imports** (`../`, `../../`, etc.) - grouped by decreasing depth

   ```js
   import { deep } from '../../../utils/deep';

   import { types } from '../../types';

   import { config } from '../config';

   import { helper } from './helper';

   import { test } from './helper/test';

   import { hello } from './helper/test/hello';
   ```

Each group is separated by a blank line, and imports within each group are sorted by:

1. **Import type priority**: side-effect → namespace → default → named
2. **First imported identifier** alphabetically (case-insensitive)
3. **Source path** as fallback when identifiers are the same

> [!NOTE]
> Type-only imports (`import type`) are treated the same as value imports for sorting purposes.

### Type keyword handling

The `type` keyword in individual import specifiers (e.g., `{ type User }`) is ignored for sorting purposes but preserved in the output. For example, `{ type CustomValue }` and `{ customType }` are sorted based on `CustomValue` vs `customType` respectively.

### On `~` prefix distinction

- `~prefix/` (like `~shared/`) is treated as a custom alias (group 5)
- `~/prefix` (like `~/config`) is treated as a root alias (group 6)

### Sorting within groups

Within the same import type, imports are sorted by the first imported identifier alphabetically (case-insensitive). For example, `import { createRoot } from 'react-dom/client'` comes before `import { useState } from 'react'` because `createRoot` < `useState` alphabetically.

### Case-insensitive sorting examples

- `import { Extract } from './module'` comes before `import { extractImportInfo } from './module'` because `E` < `e` in case-insensitive sorting
- `import { type CustomValue } from './module'` comes after `import { customType } from './module'` because `CustomValue` (stripped of `type`) comes after `customType` alphabetically

## Example

### Before

```js
import { helper } from './helper';
import React from 'react';
import { config } from '../config';
import fs from 'node:fs';
import { utils } from '@/utils';
import { deep } from '../../deep';
import express from 'express';
import type { User } from './types';
import { database } from '$lib/server/database';
```

### After

```js
import fs from 'node:fs';

import express from 'express';
import React from 'react';

import { database } from '$lib/server/database';

import { utils } from '@/utils';

import { deep } from '../../deep';

import { config } from '../config';

import { helper } from './helper';
import type { User } from './types';
```

### Case-insensitive sorting example

```js
// Before
import { FormattingPreferences } from './preferences';
import { extractImportInfo } from './utils';
import { Extract } from './extract';
import { formattingPreferences } from './preferences';

// After
import { Extract } from './extract';
import { extractImportInfo } from './utils';
import { FormattingPreferences } from './preferences';
import { formattingPreferences } from './preferences';
```

### Type keyword handling example

```js
// Before
import { customType } from './types';
import { type CustomValue } from './types';
import { TypeHelper } from './helpers';
import { typeHelper } from './helpers';

// After
import { customType } from './types';
import { type CustomValue } from './types';
import { TypeHelper } from './helpers';
import { typeHelper } from './helpers';
```

## Rule Options

Currently, the plugin works with zero configuration and doesn't accept any options. The sorting and grouping behavior is opinionated and designed to work well for most TypeScript/JavaScript projects.

## Formatting Detection

The plugin automatically detects your code's formatting preferences:

- **Quote style** (single versus double quotes)
- **Trailing commas** in import statements
- **Line length** for formatting decisions

This ensures the generated import statements match your existing code style.

## Integration with Prettier

This plugin is designed to work alongside Prettier. The plugin handles import ordering and grouping, while Prettier handles general code formatting. Make sure to run ESLint before Prettier in your formatting pipeline.
