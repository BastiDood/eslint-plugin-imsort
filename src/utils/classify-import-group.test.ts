import { describe, expect, it } from 'vitest';

import { classifyImportGroup } from './classify-import-group.ts';

describe('classifyImportGroup', () => {
  describe('runtime-namespaced imports', () => {
    it('should classify node: imports', () => {
      const result = classifyImportGroup('node:fs');
      expect(result.kind).toBe('runtime-namespaced');
      if (result.kind === 'runtime-namespaced')
        expect(result.namespace).toBe('node');

      expect(classifyImportGroup('node:path').kind).toBe('runtime-namespaced');
      expect(classifyImportGroup('node:crypto').kind).toBe(
        'runtime-namespaced',
      );
    });

    it('should classify bun: imports', () => {
      const result = classifyImportGroup('bun:test');
      expect(result.kind).toBe('runtime-namespaced');
      if (result.kind === 'runtime-namespaced')
        expect(result.namespace).toBe('bun');

      expect(classifyImportGroup('bun:sqlite').kind).toBe('runtime-namespaced');
    });

    it('should classify deno: imports', () => {
      const result = classifyImportGroup('deno:std/http');
      expect(result.kind).toBe('runtime-namespaced');
      if (result.kind === 'runtime-namespaced')
        expect(result.namespace).toBe('deno');

      expect(classifyImportGroup('deno:land/x').kind).toBe(
        'runtime-namespaced',
      );
    });

    it('should classify cloudflare: imports', () => {
      const result = classifyImportGroup('cloudflare:workers');
      expect(result.kind).toBe('runtime-namespaced');
      if (result.kind === 'runtime-namespaced')
        expect(result.namespace).toBe('cloudflare');

      expect(classifyImportGroup('cloudflare:pages').kind).toBe(
        'runtime-namespaced',
      );
    });

    it('should classify workerd: imports', () => {
      const result = classifyImportGroup('workerd:crypto');
      expect(result.kind).toBe('runtime-namespaced');
      if (result.kind === 'runtime-namespaced')
        expect(result.namespace).toBe('workerd');
    });

    it('should classify wrangler: imports', () => {
      const result = classifyImportGroup('wrangler:config');
      expect(result.kind).toBe('runtime-namespaced');
      if (result.kind === 'runtime-namespaced')
        expect(result.namespace).toBe('wrangler');
    });

    it('should be case insensitive', () => {
      expect(classifyImportGroup('NODE:fs').kind).toBe('runtime-namespaced');
      expect(classifyImportGroup('BUN:test').kind).toBe('runtime-namespaced');
      expect(classifyImportGroup('DENO:std').kind).toBe('runtime-namespaced');
    });
  });

  describe('registry-namespaced imports', () => {
    it('should classify npm: imports', () => {
      const result = classifyImportGroup('npm:lodash');
      expect(result.kind).toBe('registry-namespaced');
      if (result.kind === 'registry-namespaced')
        expect(result.namespace).toBe('npm');

      expect(classifyImportGroup('npm:@types/node').kind).toBe(
        'registry-namespaced',
      );
    });

    it('should classify jsr: imports', () => {
      const result = classifyImportGroup('jsr:@std/fs');
      expect(result.kind).toBe('registry-namespaced');
      if (result.kind === 'registry-namespaced')
        expect(result.namespace).toBe('jsr');

      expect(classifyImportGroup('jsr:@oak/oak').kind).toBe(
        'registry-namespaced',
      );
    });

    it('should classify esm: imports', () => {
      const result = classifyImportGroup('esm:react');
      expect(result.kind).toBe('registry-namespaced');
      if (result.kind === 'registry-namespaced')
        expect(result.namespace).toBe('esm');
    });

    it('should classify unpkg: imports', () => {
      const result = classifyImportGroup('unpkg:lodash');
      expect(result.kind).toBe('registry-namespaced');
      if (result.kind === 'registry-namespaced')
        expect(result.namespace).toBe('unpkg');
    });

    it('should classify cdn: imports', () => {
      const result = classifyImportGroup('cdn:react');
      expect(result.kind).toBe('registry-namespaced');
      if (result.kind === 'registry-namespaced')
        expect(result.namespace).toBe('cdn');
    });

    it('should be case insensitive', () => {
      expect(classifyImportGroup('NPM:lodash').kind).toBe(
        'registry-namespaced',
      );
      expect(classifyImportGroup('JSR:@std/fs').kind).toBe(
        'registry-namespaced',
      );
    });
  });

  describe('generic namespaced imports', () => {
    it('should classify custom namespace imports', () => {
      const result = classifyImportGroup('custom:module');
      expect(result.kind).toBe('generic-namespaced');
      if (result.kind === 'generic-namespaced')
        expect(result.namespace).toBe('custom');

      expect(classifyImportGroup('mylib:utils').kind).toBe(
        'generic-namespaced',
      );
      expect(classifyImportGroup('company:shared').kind).toBe(
        'generic-namespaced',
      );
    });

    it('should classify namespaces with numbers and dashes', () => {
      expect(classifyImportGroup('lib-2:module').kind).toBe(
        'generic-namespaced',
      );
      expect(classifyImportGroup('my_lib:utils').kind).toBe(
        'generic-namespaced',
      );
      expect(classifyImportGroup('v2:api').kind).toBe('generic-namespaced');
    });

    it('should not classify invalid namespace patterns as GenericNamespaced', () => {
      expect(classifyImportGroup('2invalid:module').kind).not.toBe(
        'generic-namespaced',
      );
      expect(classifyImportGroup('-invalid:module').kind).not.toBe(
        'generic-namespaced',
      );
    });
  });

  describe('non-namespaced bare imports', () => {
    it('should classify standard npm packages', () => {
      const result = classifyImportGroup('react');
      expect(result.kind).toBe('bare-import');
      if (result.kind === 'bare-import') expect(result.isScoped).toBe(false);

      expect(classifyImportGroup('lodash').kind).toBe('bare-import');
      expect(classifyImportGroup('express').kind).toBe('bare-import');
    });

    it('should classify scoped packages', () => {
      const result = classifyImportGroup('@types/node');
      expect(result.kind).toBe('bare-import');
      if (result.kind === 'bare-import') expect(result.isScoped).toBe(true);

      expect(classifyImportGroup('@sveltejs/kit').kind).toBe('bare-import');
      expect(classifyImportGroup('@vue/compiler-sfc').kind).toBe('bare-import');
    });

    it('should classify @namespace/package as bare imports (not aliased)', () => {
      const result = classifyImportGroup('@angular/core');
      expect(result.kind).toBe('bare-import');
      if (result.kind === 'bare-import') expect(result.isScoped).toBe(true);

      expect(classifyImportGroup('@nestjs/common').kind).toBe('bare-import');
      expect(classifyImportGroup('@mui/material').kind).toBe('bare-import');
      expect(classifyImportGroup('@babel/core').kind).toBe('bare-import');
    });

    it('should classify packages with subdirectories', () => {
      expect(classifyImportGroup('lodash/map').kind).toBe('bare-import');
      expect(classifyImportGroup('rxjs/operators').kind).toBe('bare-import');
    });
  });

  describe('custom-aliased imports with $ prefixes', () => {
    it('should classify $ aliased imports (SvelteKit convention)', () => {
      const result = classifyImportGroup('$lib/utils');
      expect(result.kind).toBe('dollar-aliased');
      if (result.kind === 'dollar-aliased') expect(result.alias).toBe('$lib');

      const appResult = classifyImportGroup('$app/stores');
      expect(appResult.kind).toBe('dollar-aliased');
      if (appResult.kind === 'dollar-aliased')
        expect(appResult.alias).toBe('$app');

      expect(classifyImportGroup('$env/dynamic/public').kind).toBe(
        'dollar-aliased',
      );
      expect(classifyImportGroup('$lib/server/database').kind).toBe(
        'dollar-aliased',
      );
    });

    it('should distinguish $ aliased imports from regular bare imports', () => {
      expect(classifyImportGroup('$lib/utils').kind).toBe('dollar-aliased');
      expect(classifyImportGroup('$app/stores').kind).toBe('dollar-aliased');
      expect(classifyImportGroup('lodash').kind).toBe('bare-import');
      expect(classifyImportGroup('react').kind).toBe('bare-import');
    });

    it('should classify deeply nested $ aliased imports', () => {
      expect(classifyImportGroup('$lib/deep/nested/path').kind).toBe(
        'dollar-aliased',
      );
      expect(classifyImportGroup('$lib/deeper/nested/path').kind).toBe(
        'dollar-aliased',
      );
      expect(classifyImportGroup('$lib/deepest/nested/path').kind).toBe(
        'dollar-aliased',
      );
    });
  });

  describe('custom-aliased imports with @/ and ~ prefixes', () => {
    it('should classify @/ aliased imports', () => {
      expect(classifyImportGroup('@/lib/utils').kind).toBe('at-aliased');
      expect(classifyImportGroup('@/components/Button').kind).toBe(
        'at-aliased',
      );
      expect(classifyImportGroup('@/types').kind).toBe('at-aliased');
    });

    it('should classify ~ aliased imports', () => {
      const rootResult = classifyImportGroup('~/utils');
      expect(rootResult.kind).toBe('tilde-aliased');
      if (rootResult.kind === 'tilde-aliased')
        expect(rootResult.isRoot).toBe(true);

      const sharedResult = classifyImportGroup('~shared/types');
      expect(sharedResult.kind).toBe('tilde-aliased');
      if (sharedResult.kind === 'tilde-aliased')
        expect(sharedResult.isRoot).toBe(false);

      const headerResult = classifyImportGroup('~/components/Header');
      expect(headerResult.kind).toBe('tilde-aliased');
      if (headerResult.kind === 'tilde-aliased')
        expect(headerResult.isRoot).toBe(true);
    });

    it('should distinguish @/ and ~ aliased imports from @namespace/package imports', () => {
      expect(classifyImportGroup('@/utils').kind).toBe('at-aliased');
      expect(classifyImportGroup('~/config').kind).toBe('tilde-aliased');
      expect(classifyImportGroup('@angular/core').kind).toBe('bare-import');
      expect(classifyImportGroup('@/components/Button').kind).toBe(
        'at-aliased',
      );
      expect(classifyImportGroup('@nestjs/common').kind).toBe('bare-import');
    });

    it('should classify deeply nested @ and ~ aliased imports', () => {
      expect(classifyImportGroup('@/shallow/path').kind).toBe('at-aliased');
      expect(classifyImportGroup('@/shallowest').kind).toBe('at-aliased');
      expect(classifyImportGroup('@/deep/nested/path').kind).toBe('at-aliased');
      expect(classifyImportGroup('~shared/deep/nested/path').kind).toBe(
        'tilde-aliased',
      );
    });
  });

  describe('complex intermingling of different aliased import types', () => {
    it('should classify different aliased import types correctly', () => {
      // $ aliased imports
      expect(classifyImportGroup('$lib/server/database').kind).toBe(
        'dollar-aliased',
      );
      expect(classifyImportGroup('$app/stores').kind).toBe('dollar-aliased');
      expect(classifyImportGroup('$env/dynamic/public').kind).toBe(
        'dollar-aliased',
      );

      // @/ aliased imports
      expect(classifyImportGroup('@/utils').kind).toBe('at-aliased');
      expect(classifyImportGroup('@/lib/utils').kind).toBe('at-aliased');
      expect(classifyImportGroup('@/components/Button').kind).toBe(
        'at-aliased',
      );

      // ~ aliased imports
      expect(classifyImportGroup('~/config').kind).toBe('tilde-aliased');
      expect(classifyImportGroup('~shared/types').kind).toBe('tilde-aliased');
    });

    it('should classify complex intermingling of bare imports with aliased imports', () => {
      // Bare imports
      expect(classifyImportGroup('react').kind).toBe('bare-import');
      expect(classifyImportGroup('express').kind).toBe('bare-import');
      expect(classifyImportGroup('lodash').kind).toBe('bare-import');
      expect(classifyImportGroup('@angular/core').kind).toBe('bare-import');
      expect(classifyImportGroup('@nestjs/common').kind).toBe('bare-import');

      // $ aliased imports
      expect(classifyImportGroup('$lib/server/database').kind).toBe(
        'dollar-aliased',
      );
      expect(classifyImportGroup('$app/stores').kind).toBe('dollar-aliased');

      // @/ aliased imports
      expect(classifyImportGroup('@/utils').kind).toBe('at-aliased');
      expect(classifyImportGroup('@/lib/utils').kind).toBe('at-aliased');

      // ~ aliased imports
      expect(classifyImportGroup('~/config').kind).toBe('tilde-aliased');
    });
  });

  describe('parent-relative imports', () => {
    it('should classify single parent directory', () => {
      const result = classifyImportGroup('../utils');
      expect(result.kind).toBe('parent-relative');
      if (result.kind === 'parent-relative') expect(result.depth).toBe(1);

      expect(classifyImportGroup('../components/Button').kind).toBe(
        'parent-relative',
      );
    });

    it('should classify multiple parent directories with correct depth', () => {
      const twoDeep = classifyImportGroup('../../utils');
      expect(twoDeep.kind).toBe('parent-relative');
      if (twoDeep.kind === 'parent-relative') expect(twoDeep.depth).toBe(2);

      const threeDeep = classifyImportGroup('../../../lib');
      expect(threeDeep.kind).toBe('parent-relative');
      if (threeDeep.kind === 'parent-relative') expect(threeDeep.depth).toBe(3);

      const fourDeep = classifyImportGroup('../../../../shared');
      expect(fourDeep.kind).toBe('parent-relative');
      if (fourDeep.kind === 'parent-relative') expect(fourDeep.depth).toBe(4);
    });

    it('should classify bare .. import', () => {
      const result = classifyImportGroup('..');
      expect(result.kind).toBe('parent-relative');
      if (result.kind === 'parent-relative') expect(result.depth).toBe(1);
    });

    it('should calculate depth correctly for complex paths', () => {
      const sevenDeep = classifyImportGroup('../../../../../../../deep');
      expect(sevenDeep.kind).toBe('parent-relative');
      if (sevenDeep.kind === 'parent-relative') expect(sevenDeep.depth).toBe(7);
    });
  });

  describe('relative imports', () => {
    it('should classify current directory imports', () => {
      const result = classifyImportGroup('./utils');
      expect(result.kind).toBe('current-directory');
      if (result.kind === 'current-directory') {
        expect(result.depth).toBe(0);
        expect(result.isBareSlash).toBe(false);
      }

      expect(classifyImportGroup('./index').kind).toBe('current-directory');
      expect(classifyImportGroup('./helper').kind).toBe('current-directory');
    });

    it('should classify bare . import as current-directory', () => {
      const result = classifyImportGroup('.');
      expect(result.kind).toBe('current-directory');
      if (result.kind === 'current-directory') {
        expect(result.depth).toBe(0);
        expect(result.isBareSlash).toBe(false);
      }
    });

    it('should classify descendant imports with correct depth', () => {
      // Depth 1: ./folder/file
      const depth1 = classifyImportGroup('./lib/helpers');
      expect(depth1.kind).toBe('current-directory');
      if (depth1.kind === 'current-directory') expect(depth1.depth).toBe(1);

      expect(classifyImportGroup('./components/Button').kind).toBe(
        'current-directory',
      );
      expect(classifyImportGroup('./helper/test').kind).toBe(
        'current-directory',
      );

      // Depth 2: ./folder/subfolder/file
      const depth2 = classifyImportGroup('./components/ui/Button');
      expect(depth2.kind).toBe('current-directory');
      if (depth2.kind === 'current-directory') expect(depth2.depth).toBe(2);

      expect(classifyImportGroup('./lib/utils/helpers').kind).toBe(
        'current-directory',
      );

      // Depth 3: ./folder/subfolder/subsubfolder/file
      const depth3 = classifyImportGroup('./components/ui/forms/Input');
      expect(depth3.kind).toBe('current-directory');
      if (depth3.kind === 'current-directory') expect(depth3.depth).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should classify empty string as bare import', () => {
      expect(classifyImportGroup('').kind).toBe('bare-import');
    });

    it('should classify just colon as bare import (invalid namespace)', () => {
      expect(classifyImportGroup(':').kind).toBe('bare-import');
    });

    it('should handle malformed paths', () => {
      expect(classifyImportGroup('//invalid').kind).toBe('bare-import');

      const bareSlash = classifyImportGroup('./');
      expect(bareSlash.kind).toBe('current-directory');
      if (bareSlash.kind === 'current-directory') {
        expect(bareSlash.depth).toBe(0);
        expect(bareSlash.isBareSlash).toBe(true);
      }
    });
  });
});
