import svelteParser from 'svelte-eslint-parser';
import { createRuleTester } from 'eslint-vitest-rule-tester';
import { describe, it } from 'vitest';

import { sortImports } from './rule.js';

describe('imsort/sort-imports - Svelte files', () => {
  const { valid, invalid } = createRuleTester({
    name: 'sort-imports',
    rule: sortImports,
    configs: {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: svelteParser,
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          parser: {
            // Enable TypeScript parsing for script blocks with lang="ts"
            ts: '@typescript-eslint/parser',
          },
          // Add TypeScript-specific options
          project: null,
        },
      },
    },
  });

  describe('Svelte script blocks - JavaScript', () => {
    it('should handle single import in script block', () => {
      valid(`
<script>
  import { Component } from 'react';
</script>

<div>Hello</div>
      `);
    });

    it('should handle no imports in script block', () => {
      valid(`
<script>
  const x = 1;
</script>

<div>Hello</div>
      `);
    });

    it('should handle already correctly sorted imports in script block', () => {
      valid(`
<script>
  import { readFile } from 'node:fs/promises';

  import { Component } from 'react';

  import { utils } from '@/utils';

  import { helper } from './helper';
</script>

<div>Hello</div>
      `);
    });

    it('should handle side-effect imports first in script block', () => {
      valid(`
<script>
  import 'normalize.css';

  import { Component } from 'react';

  import { helper } from './helper';
</script>

<div>Hello</div>
      `);
    });

    it('should detect when imports need reordering in script block', () => {
      invalid({
        code: `
<script>
  import { helper } from './helper';
  import { Component } from 'react';
</script>

<div>Hello</div>
        `,
        errors: 1,
      });
    });

    it('should fix basic import reordering in script block', () => {
      invalid({
        code: `
<script>
  import { helper } from './helper';
  import { Component } from 'react';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script>
  import { Component } from 'react';

  import { helper } from './helper';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should fix complex import grouping in script block', () => {
      invalid({
        code: `
<script>
  import { relative } from './relative';
  import { aliased } from '@/aliased';
  import { external } from 'external';
  import { node } from 'node:fs';
  import 'side-effect';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script>
  import { node } from 'node:fs';

  import 'side-effect';
  import { external } from 'external';

  import { aliased } from '@/aliased';

  import { relative } from './relative';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should handle mixed import types in script block', () => {
      invalid({
        code: `
<script>
  import default2 from './default2';
  import { named } from './named';
  import * as namespace from './namespace';
  import default1 from './default1';
  import { Component } from 'react';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script>
  import { Component } from 'react';

  import * as namespace from './namespace';
  import default1 from './default1';
  import default2 from './default2';
  import { named } from './named';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should handle unsorted identifiers within named imports in script block', () => {
      invalid({
        code: `
<script>
  import { useState, useEffect, useCallback } from 'react';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script>
  import { useCallback, useEffect, useState } from 'react';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should handle multiple imports with unsorted identifiers in script block', () => {
      invalid({
        code: `
<script>
  import { readFile, writeFile, stat } from 'node:fs/promises';
  import { useState, useEffect, useCallback } from 'react';
  import { z, b, a } from './utils';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script>
  import { readFile, stat, writeFile } from 'node:fs/promises';

  import { useCallback, useEffect, useState } from 'react';

  import { a, b, z } from './utils';
</script>

<div>Hello</div>
        `,
      });
    });
  });

  describe('Svelte script blocks - TypeScript', () => {
    it('should handle TypeScript imports in script block with lang="ts"', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
</script>

<div>Hello</div>
      `);
    });

    it('should handle type-only imports in TypeScript script block', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  import { helper } from './helper';
</script>

<div>Hello</div>
      `);
    });

    it('should handle mixed type and value imports in TypeScript script block', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  import { helper, type User } from './types';
</script>

<div>Hello</div>
      `);
    });

    it('should fix type-only imports in TypeScript script block', () => {
      invalid({
        code: `
<script lang="ts">
  import { helper } from './helper';
  import type { Config } from 'eslint';
  import { Component } from 'react';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  import { helper } from './helper';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should fix mixed type and value imports in TypeScript script block', () => {
      invalid({
        code: `
<script lang="ts">
  import { helper, type User } from './types';
  import { Component } from 'react';
  import type { Config } from 'eslint';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  import { helper, type User } from './types';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should handle complex TypeScript imports with aliases', () => {
      invalid({
        code: `
<script lang="ts">
  import { helper } from './helper';
  import { database } from '$lib/server/database';
  import { stores } from '$app/stores';
  import { aliased } from '@/aliased';
  import { react } from 'react';
  import type { User } from './types';
</script>

<div>Hello</div>
        `,
        errors: 1,
        output: `
<script lang="ts">
  import { react } from 'react';

  import { database } from '$lib/server/database';
  import { stores } from '$app/stores';

  import { aliased } from '@/aliased';

  import { helper } from './helper';
  import type { User } from './types';
</script>

<div>Hello</div>
        `,
      });
    });

    it('should handle TypeScript imports with interface definitions', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  interface Props {
    name: string;
  }
</script>

<div>Hello</div>
      `);
    });

    it('should handle TypeScript imports with type definitions', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  type User = {
    id: string;
    name: string;
  };
</script>

<div>Hello</div>
      `);
    });
  });

  describe('Svelte script blocks - edge cases', () => {
    it('should handle script block with only HTML content', () => {
      valid(`
<div>Hello</div>
      `);
    });

    it('should handle script block with only comments', () => {
      valid(`
<script>
  // This is a comment
</script>

<div>Hello</div>
      `);
    });

    it('should handle script block with variables and imports', () => {
      valid(`
<script>
  import { Component } from 'react';

  const name = 'World';
  let count = 0;
</script>

<div>Hello {name}</div>
      `);
    });

    it('should handle script block with reactive statements', () => {
      valid(`
<script>
  import { Component } from 'react';

  let count = 0;

  $: doubled = count * 2;
</script>

<div>Count: {count}</div>
      `);
    });

    it('should handle script block with functions', () => {
      valid(`
<script>
  import { Component } from 'react';

  function increment() {
    count += 1;
  }

  let count = 0;
</script>

<div>Count: {count}</div>
      `);
    });

    it('should handle script block with exports', () => {
      valid(`
<script>
  import { Component } from 'react';

  export let name = 'World';
</script>

<div>Hello {name}</div>
      `);
    });

    it('should handle script block with onMount', () => {
      valid(`
<script>
  import { Component } from 'react';
  import { onMount } from 'svelte';

  onMount(() => {
    console.log('Component mounted');
  });
</script>

<div>Hello</div>
      `);
    });

    it('should handle script block with multiple reactive statements', () => {
      valid(`
<script>
  import { Component } from 'react';

  let count = 0;
  let name = 'World';

  $: doubled = count * 2;
  $: greeting = \`Hello \${name}\`;
</script>

<div>{greeting}</div>
      `);
    });

    it('should handle script block with complex TypeScript types', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  interface User {
    id: string;
    name: string;
    email: string;
  }

  type UserList = User[];

  export let users: UserList = [];
</script>

<div>Users: {users.length}</div>
      `);
    });

    it('should handle script block with generic types', () => {
      valid(`
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  interface ApiResponse<T> {
    data: T;
    status: number;
  }

  type UserResponse = ApiResponse<User>;
</script>

<div>Hello</div>
      `);
    });
  });

  describe('Svelte script blocks - complex scenarios', () => {
    it('should handle comprehensive real-world Svelte component', () => {
      invalid({
        code: `
<script lang="ts">
  import { helper } from './helper';
  import { deep } from '$lib/deep/nested/path';
  import { shallow } from '@/shallow/path';
  import { react } from 'react';
  import { deeper } from '$lib/deeper/nested/path';
  import { shallowest } from '@/shallowest';
  import { express } from 'express';
  import { deepest } from '$lib/deepest/nested/path';
  import { angular } from '@angular/core';
  import { database } from '$lib/server/database';
  import { stores } from '$app/stores';
  import { env } from '$env/dynamic/public';
  import { aliased } from '@/aliased';
  import { utils } from '@/utils';
  import { config } from '~/config';
  import { shared } from '~shared/types';
  import { lodash } from 'lodash';
  import { readFile } from 'node:fs/promises';
  import { types } from './types';
  import { parent } from '../parent';
  import { grandparent } from '../../grandparent';

  interface Props {
    name: string;
  }

  export let name: string;

  let count = 0;

  $: doubled = count * 2;

  function increment() {
    count += 1;
  }
</script>

<div>Hello {name}</div>
        `,
        errors: 1,
        output: `
<script lang="ts">
  import { readFile } from 'node:fs/promises';

  import { angular } from '@angular/core';
  import { express } from 'express';
  import { lodash } from 'lodash';
  import { react } from 'react';

  import { database } from '$lib/server/database';
  import { deep } from '$lib/deep/nested/path';
  import { deeper } from '$lib/deeper/nested/path';
  import { deepest } from '$lib/deepest/nested/path';
  import { env } from '$env/dynamic/public';
  import { shared } from '~shared/types';
  import { stores } from '$app/stores';

  import { aliased } from '@/aliased';
  import { config } from '~/config';
  import { shallow } from '@/shallow/path';
  import { shallowest } from '@/shallowest';
  import { utils } from '@/utils';

  import { grandparent } from '../../grandparent';

  import { parent } from '../parent';

  import { helper } from './helper';
  import { types } from './types';

  interface Props {
    name: string;
  }

  export let name: string;

  let count = 0;

  $: doubled = count * 2;

  function increment() {
    count += 1;
  }
</script>

<div>Hello {name}</div>
        `,
      });
    });

    it('should handle Svelte component with mixed type imports and reactive statements', () => {
      invalid({
        code: `
<script lang="ts">
  import { helper, type User } from './types';
  import { Component } from 'react';
  import type { Config } from 'eslint';
  import { stores } from '$app/stores';
  import { database } from '$lib/server/database';

  interface Props {
    user: User;
  }

  export let user: User;

  let count = 0;

  $: userGreeting = \`Hello \${user.name}\`;
  $: doubled = count * 2;

  function increment() {
    count += 1;
  }
</script>

<div>{userGreeting}</div>
        `,
        errors: 1,
        output: `
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';

  import { database } from '$lib/server/database';
  import { stores } from '$app/stores';

  import { helper, type User } from './types';

  interface Props {
    user: User;
  }

  export let user: User;

  let count = 0;

  $: userGreeting = \`Hello \${user.name}\`;
  $: doubled = count * 2;

  function increment() {
    count += 1;
  }
</script>

<div>{userGreeting}</div>
        `,
      });
    });

    it('should handle Svelte component with onMount and imports', () => {
      invalid({
        code: `
<script lang="ts">
  import { helper } from './helper';
  import { onMount } from 'svelte';
  import { Component } from 'react';
  import type { Config } from 'eslint';

  let mounted = false;

  onMount(() => {
    mounted = true;
    console.log('Component mounted');
  });
</script>

<div>Mounted: {mounted}</div>
        `,
        errors: 1,
        output: `
<script lang="ts">
  import { Component } from 'react';
  import type { Config } from 'eslint';
  import { onMount } from 'svelte';

  import { helper } from './helper';

  let mounted = false;

  onMount(() => {
    mounted = true;
    console.log('Component mounted');
  });
</script>

<div>Mounted: {mounted}</div>
        `,
      });
    });
  });
});
