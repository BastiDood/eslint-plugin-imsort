# Imsort: Import Sort

An opinionated ESLint plugin for sorting and grouping imports automatically.

## Features

- **Automatic import sorting** within logical groups
- **Smart import grouping** based on import source patterns
- **Blank line separation** between different import groups
- **Preserves formatting preferences** (quotes, trailing commas, line length)
- **Zero configuration** - works out of the box with sensible defaults
- **Auto-fixable** - automatically sorts imports when running `eslint --fix`

## Configuration

> [!CAUTION]
> This plugin conflicts with the built-in `sort-imports` rule.

[`sort-imports`]: https://eslint.org/docs/latest/rules/sort-imports

### ESLint Flat Config (recommended!)

Add the plugin to your `eslint.config.js`:

```js
import imsort from 'eslint-plugin-imsort';

export default [
  {
    files: ['**/*.{j,t}s{,x}'],
    plugins: { '@bastidood/imsort': imsort },
    rules: { '@bastidood/imsort/sort-imports': 'error' },
  },
];
```

### Legacy ESLint Config

Add to your `.eslintrc.json`:

```json
{
  "plugins": ["imsort"],
  "rules": { "imsort/sort-imports": "error" }
}
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
   import React from 'react';
   import express from 'express';
   import type { Config } from '@types/config';
   ```

5. **Custom-aliased imports** (`@/*`, `~/*`, `~shared/*`, etc.)

   ```js
   import { utils } from '@/utils';
   import config from '~/config';
   import shared from '~shared/types';
   ```

6. **Relative imports** (`../`, `../../`, etc.) - grouped by decreasing depth

   ```js
   import { deep } from '../../../utils/deep';

   import { types } from '../../types';

   import { config } from '../config';

   import { helper } from './helper';

   import { test } from './helper/test';

   import { hello } from './helper/test/hello';
   ```

Each group is separated by a blank line, and imports within each group are sorted alphabetically.

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
```

### After

```js
import fs from 'node:fs';

import express from 'express';
import React from 'react';

import { utils } from '@/utils';

import { deep } from '../../deep';
import { config } from '../config';

import { helper } from './helper';
import type { User } from './types';
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

## Requirements

- Node.js 22.6.0+
- ESLint 9.0.0+

## License

MIT
