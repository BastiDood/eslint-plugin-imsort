import { describe, expect, it } from 'vitest';
import { getImportGroupPriority } from './get-import-group-priority.js';

describe('getImportGroupPriority', () => {
  describe('runtime-namespaced imports (priority 0)', () => {
    it('should prioritize node: imports', () => {
      expect(getImportGroupPriority('node:fs')).toBe(0);
      expect(getImportGroupPriority('node:path')).toBe(0);
      expect(getImportGroupPriority('node:crypto')).toBe(0);
    });
    it('should prioritize bun: imports', () => {
      expect(getImportGroupPriority('bun:test')).toBe(0);
      expect(getImportGroupPriority('bun:sqlite')).toBe(0);
    });
    it('should prioritize deno: imports', () => {
      expect(getImportGroupPriority('deno:std/http')).toBe(0);
      expect(getImportGroupPriority('deno:land/x')).toBe(0);
    });
    it('should prioritize cloudflare: imports', () => {
      expect(getImportGroupPriority('cloudflare:workers')).toBe(0);
      expect(getImportGroupPriority('cloudflare:pages')).toBe(0);
    });
    it('should prioritize workerd: imports', () => {
      expect(getImportGroupPriority('workerd:crypto')).toBe(0);
    });
    it('should prioritize wrangler: imports', () => {
      expect(getImportGroupPriority('wrangler:config')).toBe(0);
    });
    it('should be case insensitive', () => {
      expect(getImportGroupPriority('NODE:fs')).toBe(0);
      expect(getImportGroupPriority('BUN:test')).toBe(0);
      expect(getImportGroupPriority('DENO:std')).toBe(0);
    });
  });
  describe('registry-namespaced imports (priority 1)', () => {
    it('should prioritize npm: imports', () => {
      expect(getImportGroupPriority('npm:lodash')).toBe(1);
      expect(getImportGroupPriority('npm:@types/node')).toBe(1);
    });
    it('should prioritize jsr: imports', () => {
      expect(getImportGroupPriority('jsr:@std/fs')).toBe(1);
      expect(getImportGroupPriority('jsr:@oak/oak')).toBe(1);
    });
    it('should prioritize esm: imports', () => {
      expect(getImportGroupPriority('esm:react')).toBe(1);
    });
    it('should prioritize unpkg: imports', () => {
      expect(getImportGroupPriority('unpkg:lodash')).toBe(1);
    });
    it('should prioritize cdn: imports', () => {
      expect(getImportGroupPriority('cdn:react')).toBe(1);
    });
    it('should be case insensitive', () => {
      expect(getImportGroupPriority('NPM:lodash')).toBe(1);
      expect(getImportGroupPriority('JSR:@std/fs')).toBe(1);
    });
  });

  describe('generic namespaced imports (priority 2)', () => {
    it('should handle custom namespace imports', () => {
      expect(getImportGroupPriority('custom:module')).toBe(2);
      expect(getImportGroupPriority('mylib:utils')).toBe(2);
      expect(getImportGroupPriority('company:shared')).toBe(2);
    });
    it('should handle namespaces with numbers and dashes', () => {
      expect(getImportGroupPriority('lib-2:module')).toBe(2);
      expect(getImportGroupPriority('my_lib:utils')).toBe(2);
      expect(getImportGroupPriority('v2:api')).toBe(2);
    });
    it('should not match invalid namespace patterns', () => {
      expect(getImportGroupPriority('2invalid:module')).not.toBe(2);
      expect(getImportGroupPriority('-invalid:module')).not.toBe(2);
    });
  });
  describe('non-namespaced bare imports (priority 3)', () => {
    it('should handle standard npm packages', () => {
      expect(getImportGroupPriority('react')).toBe(3);
      expect(getImportGroupPriority('lodash')).toBe(3);
      expect(getImportGroupPriority('express')).toBe(3);
    });
    it('should handle scoped packages', () => {
      expect(getImportGroupPriority('@types/node')).toBe(3);
      expect(getImportGroupPriority('@sveltejs/kit')).toBe(3);
      expect(getImportGroupPriority('@vue/compiler-sfc')).toBe(3);
    });
    it('should handle packages with subdirectories', () => {
      expect(getImportGroupPriority('lodash/map')).toBe(3);
      expect(getImportGroupPriority('rxjs/operators')).toBe(3);
    });
  });
  describe('custom-aliased imports (priority 4)', () => {
    it('should handle @ aliased imports', () => {
      expect(getImportGroupPriority('@/lib/utils')).toBe(4);
      expect(getImportGroupPriority('@/components/Button')).toBe(4);
      expect(getImportGroupPriority('@/types')).toBe(4);
    });
    it('should handle ~ aliased imports', () => {
      expect(getImportGroupPriority('~/utils')).toBe(4);
      expect(getImportGroupPriority('~shared/types')).toBe(4);
      expect(getImportGroupPriority('~/components/Header')).toBe(4);
    });
  });
  describe('parent-relative imports (priority 50-depth)', () => {
    it('should handle single parent directory', () => {
      expect(getImportGroupPriority('../utils')).toBe(49); // 50 - 1
      expect(getImportGroupPriority('../components/Button')).toBe(49);
    });
    it('should handle multiple parent directories with decreasing priority', () => {
      expect(getImportGroupPriority('../../utils')).toBe(48); // 50 - 2
      expect(getImportGroupPriority('../../../lib')).toBe(47); // 50 - 3
      expect(getImportGroupPriority('../../../../shared')).toBe(46); // 50 - 4
    });
    it('should handle bare .. import', () => {
      expect(getImportGroupPriority('..')).toBe(49);
    });
    it('should calculate depth correctly for complex paths', () => {
      expect(getImportGroupPriority('../../../../../../../deep')).toBe(43); // 50 - 7
    });
  });
  describe('relative imports', () => {
    it('should handle current directory imports (priority 50)', () => {
      expect(getImportGroupPriority('./utils')).toBe(50);
      expect(getImportGroupPriority('./index')).toBe(50);
      expect(getImportGroupPriority('./helper')).toBe(50);
    });

    it('should handle descendant imports with increasing priority by depth', () => {
      // Depth 1: ./folder/file
      expect(getImportGroupPriority('./lib/helpers')).toBe(51); // 50 + 1
      expect(getImportGroupPriority('./components/Button')).toBe(51); // 50 + 1
      expect(getImportGroupPriority('./helper/test')).toBe(51); // 50 + 1

      // Depth 2: ./folder/subfolder/file
      expect(getImportGroupPriority('./components/ui/Button')).toBe(52); // 50 + 2
      expect(getImportGroupPriority('./lib/utils/helpers')).toBe(52); // 50 + 2

      // Depth 3: ./folder/subfolder/subsubfolder/file
      expect(getImportGroupPriority('./components/ui/forms/Input')).toBe(53); // 50 + 3
    });
  });
  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(getImportGroupPriority('')).toBe(3); // Falls through to default
    });
    it('should handle just colon', () => {
      expect(getImportGroupPriority(':')).toBe(3); // Invalid namespace, falls through
    });
    it('should handle malformed paths', () => {
      expect(getImportGroupPriority('//invalid')).toBe(3);
      expect(getImportGroupPriority('.')).toBe(3);
      expect(getImportGroupPriority('./')).toBe(6); // Still matches ./
    });
  });
});
