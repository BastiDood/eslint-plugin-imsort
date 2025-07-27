# Imsort: Import Sort

An opinionated ESLint plugin for sorting and grouping imports automatically.

## Features

- **Automatic import sorting** within logical groups
- **Smart import grouping** based on import source patterns
- **Blank line separation** between different import groups
- **Preserves original formatting** (quotes, spacing)
- **Zero configuration** - works out of the box with sensible defaults
- **Auto-fixable** - automatically sorts imports when running `eslint --fix`
- **Enhanced mixed type import support** - properly handles mixed type and value imports in the same statement
- **Circular fix prevention** - prevents unnecessary fixes when imports are already correctly sorted
- **Natural sorting** - supports natural number sorting (e.g., `item1`, `item2`, `item10`, `item20`, etc.)
- **Case-sensitive sorting** - prioritizes uppercase identifiers over lowercase when they start with the same letter

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

### Mixed type import support

The plugin now fully supports mixed type imports where some specifiers are type-only and others are value imports:

```diff
- import { helper, type Config, value, type User } from './types';
+ import { type Config, helper, type User, value } from './types';
```

This works for both standalone named imports and mixed default + named imports:

```diff
- import React, { useEffect, type Component, useState } from 'react';
+ import React, { type Component, useEffect, useState } from 'react';
```

### Natural sorting

The plugin supports natural sorting for identifiers containing numbers:

```diff
- import { item10, item1, item20, item2 } from './utils';
+ import { item1, item2, item10, item20 } from './utils';
```

### Case-sensitive sorting with uppercase precedence

When identifiers start with the same letter but have different cases, uppercase identifiers are prioritized:

```diff
- import { customType, CustomTypeValues, typeHelper, TypeHelper } from './types';
+ import { CustomTypeValues, customType, TypeHelper, typeHelper } from './types';
```

### On `~` prefix distinction

- `~prefix/` (like `~shared/`) is treated as a custom alias (group 5)
- `~/prefix` (like `~/config`) is treated as a root alias (group 6)

### Sorting within groups

Within the same import type, imports are sorted by the first imported identifier alphabetically (case-insensitive). For example, `import { createRoot } from 'react-dom/client'` comes before `import { useState } from 'react'` because `createRoot` < `useState` alphabetically.

### Case-insensitive sorting examples

- `import { Extract } from './module'` comes before `import { extractImportInfo } from './module'` because `E` < `e` in case-insensitive sorting
- `import { type CustomValue } from './module'` comes after `import { customType } from './module'` because `CustomValue` (stripped of `type`) comes after `customType` alphabetically

## Example

```diff
- import { helper } from './helper';
- import React from 'react';
- import { config } from '../config';
- import fs from 'node:fs';
- import { utils } from '@/utils';
- import { deep } from '../../deep';
- import express from 'express';
- import type { User } from './types';
- import { database } from '$lib/server/database';
+ import fs from 'node:fs';
+
+ import express from 'express';
+ import React from 'react';
+
+ import { database } from '$lib/server/database';
+
+ import { utils } from '@/utils';
+
+ import { deep } from '../../deep';
+
+ import { config } from '../parent';
+
+ import { helper } from './helper';
+ import type { User } from './types';
```

### Mixed type import example

```diff
- import { helper, type Config, value, type User } from './types';
- import React, { useEffect, type Component, useState } from 'react';
+ import React, { type Component, useEffect, useState } from 'react';
+
+ import { type Config, helper, type User, value } from './types';
```

### Natural sorting example

```diff
- import { item10, item1, item20, item2 } from './utils';
+ import { item1, item2, item10, item20 } from './utils';
```

### Case-sensitive sorting example

```diff
- import { customType, CustomTypeValues, typeHelper, TypeHelper } from './types';
+ import { CustomTypeValues, customType, TypeHelper, typeHelper } from './types';
```

### Type keyword handling example

```diff
- import { customType } from './types';
- import { type CustomValue } from './types';
- import { TypeHelper } from './helpers';
- import { typeHelper } from './helpers';
+ import { type CustomValue } from './types';
+ import { customType } from './types';
+ import { TypeHelper } from './helpers';
+ import { typeHelper } from './helpers';
```

> [!NOTE]
> This rule does not convert `import { type CustomValue }` to `import type { CustomValue }` as that is beyond the scope of its functionality.

## Rule Options

Currently, the plugin works with zero configuration and doesn't accept any options. The sorting and grouping behavior is opinionated and designed to work well for most TypeScript/JavaScript projects.

## Formatting Preservation

The plugin preserves the original formatting of each import statement:

- **Quote style** - maintains the original quote style (single or double quotes) for each import
- **Spacing** - preserves the original spacing and formatting

This ensures the generated import statements maintain consistency with your existing code style while letting dedicated formatters like Prettier handle formatting decisions.

## Integration with Prettier

This plugin is designed to work alongside Prettier. The plugin handles import ordering and grouping while preserving original formatting, while Prettier handles general code formatting decisions like trailing commas and line breaks. Make sure to run ESLint before Prettier in your formatting pipeline.
