import { describe, expect, it } from 'vitest';

import type { ImportNode } from '#types.ts';

import { sortImportsInGroup } from './sort-imports-in-group.js';

// Helper function to create mock import nodes
function createMockImport(
  type: ImportNode['type'],
  identifiers: string[],
  source = 'test-module',
): ImportNode {
  return {
    source,
    text: `import ${identifiers.join(', ')} from '${source}';`,
    line: 1,
    type,
    identifiers: identifiers.map(name => ({ imported: name })),
    isTypeOnly: false,
  };
}

describe('sortImportsInGroup', () => {
  describe('sorting by import type priority', () => {
    it('should sort side-effect imports first', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['Button'], 'react'),
        createMockImport('side-effect', [], 'polyfill'),
        createMockImport('default', ['React'], 'react'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted[0]?.type).toBe('side-effect');
      expect(sorted[1]?.type).toBe('default');
      expect(sorted[2]?.type).toBe('named');
    });
    it('should sort in correct type order: side-effect, namespace, default, named', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['useState'], 'react'),
        createMockImport('default', ['React'], 'react'),
        createMockImport('namespace', ['utils'], 'lodash'),
        createMockImport('side-effect', [], 'polyfill'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted.map(imp => imp.type)).toEqual([
        'side-effect',
        'namespace',
        'default',
        'named',
      ]);
    });
  });
  describe('sorting by first identifier within same type', () => {
    it('should sort named imports alphabetically by first identifier', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['useState', 'useEffect'], 'react'),
        createMockImport('named', ['axios'], 'axios'),
        createMockImport('named', ['debounce', 'throttle'], 'lodash'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted.map(imp => imp.identifiers[0]?.imported)).toEqual([
        'axios',
        'debounce',
        'useState',
      ]);
    });
    it('should sort default imports alphabetically by identifier', () => {
      const imports: ImportNode[] = [
        createMockImport('default', ['React'], 'react'),
        createMockImport('default', ['axios'], 'axios'),
        createMockImport('default', ['lodash'], 'lodash'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted.map(imp => imp.identifiers[0]?.imported)).toEqual([
        'axios',
        'lodash',
        'React',
      ]);
    });
    it('should sort namespace imports alphabetically by identifier', () => {
      const imports: ImportNode[] = [
        createMockImport('namespace', ['utils'], 'utils'),
        createMockImport('namespace', ['api'], 'api-client'),
        createMockImport('namespace', ['helpers'], 'helpers'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted.map(imp => imp.identifiers[0]?.imported)).toEqual([
        'api',
        'helpers',
        'utils',
      ]);
    });
  });
  describe('sorting side-effect imports by source', () => {
    it('should sort side-effect imports by source name when no identifiers', () => {
      const imports: ImportNode[] = [
        createMockImport('side-effect', [], 'z-polyfill'),
        createMockImport('side-effect', [], 'a-polyfill'),
        createMockImport('side-effect', [], 'm-polyfill'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted.map(imp => imp.source)).toEqual([
        'a-polyfill',
        'm-polyfill',
        'z-polyfill',
      ]);
    });
  });
  describe('natural sorting with numbers', () => {
    it('should handle numeric sorting correctly', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['item10'], 'module'),
        createMockImport('named', ['item2'], 'module'),
        createMockImport('named', ['item1'], 'module'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(sorted.map(imp => imp.identifiers[0]?.imported)).toEqual([
        'item1',
        'item2',
        'item10',
      ]);
    });
    it('should be case insensitive', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['Zeus'], 'module'),
        createMockImport('named', ['alpha'], 'module'),
        createMockImport('named', ['Beta'], 'module'),
      ];
      const sorted = sortImportsInGroup(imports);
      // Case-insensitive sorting: alphabetical order regardless of case
      // 'a'lpha < 'B'eta < 'Z'eus
      expect(sorted.map(imp => imp.identifiers[0]?.imported)).toEqual([
        'alpha',
        'Beta',
        'Zeus',
      ]);
    });
    it('should demonstrate sorting ignoring type keyword but preserving it', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['type CustomValue'], 'module'),
        createMockImport('named', ['customType'], 'module'),
        createMockImport('named', ['TypeHelper'], 'module'),
        createMockImport('named', ['typeHelper'], 'module'),
      ];
      const sorted = sortImportsInGroup(imports);
      // Sort by identifier name ignoring 'type' keyword, case-insensitive
      // 'c'ustomType < 'C'ustomValue < 'T'ypeHelper < 't'ypeHelper
      expect(sorted.map(imp => imp.identifiers[0]?.imported)).toEqual([
        'customType',
        'type CustomValue',
        'TypeHelper',
        'typeHelper',
      ]);
    });
  });
  describe('complex sorting scenarios', () => {
    it('should handle mixed types with same first identifiers', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['React'], 'react/named'),
        createMockImport('default', ['React'], 'react'),
        createMockImport('namespace', ['React'], 'react/namespace'),
      ];
      const sorted = sortImportsInGroup(imports);
      // Should sort by type priority first, then by identifier
      expect(sorted.map(imp => imp.type)).toEqual([
        'namespace',
        'default',
        'named',
      ]);
      // All should have same first identifier
      expect(
        sorted.every(imp => imp.identifiers[0]?.imported === 'React'),
      ).toBe(true);
    });
    it('should handle empty identifiers gracefully', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['valid'], 'module'),
        createMockImport('named', [], 'empty-module'), // Edge case: empty identifiers
      ];
      // Should not throw and should handle gracefully
      expect(() => sortImportsInGroup(imports)).not.toThrow();
      const sorted = sortImportsInGroup(imports);
      expect(sorted).toHaveLength(2);
    });
    it('should handle undefined identifiers gracefully', () => {
      const mockImport: ImportNode = {
        source: 'test',
        text: 'import test',
        line: 1,
        type: 'named',
        identifiers: [], // Empty array
        isTypeOnly: false,
      };
      const imports = [
        createMockImport('named', ['valid'], 'module'),
        mockImport,
      ];
      expect(() => sortImportsInGroup(imports)).not.toThrow();
    });
  });
  describe('real-world import scenarios', () => {
    it('should sort a realistic mix of React imports', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['useState', 'useEffect'], 'react'),
        createMockImport('side-effect', [], 'react-dom/styles.css'),
        createMockImport('default', ['React'], 'react'),
        createMockImport('namespace', ['ReactDOM'], 'react-dom'),
        createMockImport('named', ['createRoot'], 'react-dom/client'),
      ];
      const sorted = sortImportsInGroup(imports);
      expect(
        sorted.map(imp => ({
          type: imp.type,
          firstId: imp.identifiers[0]?.imported || imp.source,
        })),
      ).toEqual([
        { type: 'side-effect', firstId: 'react-dom/styles.css' },
        { type: 'namespace', firstId: 'ReactDOM' },
        { type: 'default', firstId: 'React' },
        { type: 'named', firstId: 'createRoot' },
        { type: 'named', firstId: 'useState' },
      ]);
    });
    it('should maintain stability for equal items', () => {
      const imports: ImportNode[] = [
        createMockImport('named', ['sameId'], 'module-a'),
        createMockImport('named', ['sameId'], 'module-b'),
      ];
      const sorted = sortImportsInGroup(imports);
      // Should maintain original order when all comparison factors are equal
      expect(sorted[0]?.source).toBe('module-a');
      expect(sorted[1]?.source).toBe('module-b');
    });
  });
  describe('regression tests - import type priority', () => {
    it('should correctly prioritize import types within same group', () => {
      const imports: ImportNode[] = [
        // Named imports
        createMockImport('named', ['test'], './relative'),
        createMockImport('named', ['world'], '@world'),
        // Default imports
        createMockImport('default', ['defaulted'], './relative'),
        createMockImport('default', ['hello'], '@/root'),
        // Namespace imports
        createMockImport('namespace', ['namespace'], './relative'),
        // Side-effect imports
        createMockImport('side-effect', [], './relative'),
      ];
      const sorted = sortImportsInGroup(imports);

      // Should sort by import type priority: side-effect → namespace → default → named
      expect(
        sorted.map(imp => ({
          type: imp.type,
          firstId: imp.identifiers[0]?.imported || imp.source,
        })),
      ).toEqual([
        { type: 'side-effect', firstId: './relative' },
        { type: 'namespace', firstId: 'namespace' },
        { type: 'default', firstId: 'defaulted' },
        { type: 'default', firstId: 'hello' },
        { type: 'named', firstId: 'test' },
        { type: 'named', firstId: 'world' },
      ]);
    });

    it('should handle type-only vs value imports correctly', () => {
      const imports: ImportNode[] = [
        // Value imports
        createMockImport('default', ['valueDefault'], './module'),
        createMockImport('named', ['valueNamed'], './module'),
        // Type-only imports
        {
          ...createMockImport('default', ['typeDefault'], './module'),
          isTypeOnly: true,
        },
        {
          ...createMockImport('named', ['typeNamed'], './module'),
          isTypeOnly: true,
        },
      ];
      const sorted = sortImportsInGroup(imports);

      // Type-only vs value imports should be treated the same for sorting
      // Should sort by import type priority first, then by first identifier
      expect(
        sorted.map(imp => ({
          type: imp.type,
          isTypeOnly: imp.isTypeOnly,
          firstId: imp.identifiers[0]?.imported,
        })),
      ).toEqual([
        { type: 'default', isTypeOnly: true, firstId: 'typeDefault' },
        { type: 'default', isTypeOnly: false, firstId: 'valueDefault' },
        { type: 'named', isTypeOnly: true, firstId: 'typeNamed' },
        { type: 'named', isTypeOnly: false, firstId: 'valueNamed' },
      ]);
    });

    it('should sort alphabetically within same import type', () => {
      const imports: ImportNode[] = [
        // Default imports with different first identifiers
        createMockImport('default', ['zebra'], './module'),
        createMockImport('default', ['alpha'], './module'),
        createMockImport('default', ['beta'], './module'),
        // Named imports with different first identifiers
        createMockImport('named', ['zebra'], './module'),
        createMockImport('named', ['alpha'], './module'),
        createMockImport('named', ['beta'], './module'),
      ];
      const sorted = sortImportsInGroup(imports);

      // Should sort by import type first, then alphabetically by first identifier
      expect(
        sorted.map(imp => ({
          type: imp.type,
          firstId: imp.identifiers[0]?.imported,
        })),
      ).toEqual([
        { type: 'default', firstId: 'alpha' },
        { type: 'default', firstId: 'beta' },
        { type: 'default', firstId: 'zebra' },
        { type: 'named', firstId: 'alpha' },
        { type: 'named', firstId: 'beta' },
        { type: 'named', firstId: 'zebra' },
      ]);
    });

    it('should handle complex mixed scenario with all import types', () => {
      const imports: ImportNode[] = [
        // Side-effect imports
        createMockImport('side-effect', [], './styles.css'),
        createMockImport('side-effect', [], './polyfill.js'),
        // Namespace imports
        createMockImport('namespace', ['utils'], './utils'),
        createMockImport('namespace', ['api'], './api'),
        // Default imports
        createMockImport('default', ['Component'], './Component'),
        createMockImport('default', ['config'], './config'),
        createMockImport('default', ['helper'], './helper'),
        // Named imports
        createMockImport('named', ['useState'], './hooks'),
        createMockImport('named', ['Button'], './components'),
        createMockImport('named', ['api'], './api'),
        // Type-only imports
        {
          ...createMockImport('default', ['Type'], './types'),
          isTypeOnly: true,
        },
        {
          ...createMockImport('named', ['Props'], './types'),
          isTypeOnly: true,
        },
      ];
      const sorted = sortImportsInGroup(imports);

      // Should sort by: side-effect → namespace → default → named
      // Within each type, sort alphabetically by first identifier
      // Type-only vs value imports are treated the same
      expect(
        sorted.map(imp => ({
          type: imp.type,
          isTypeOnly: imp.isTypeOnly,
          firstId: imp.identifiers[0]?.imported || imp.source,
        })),
      ).toEqual([
        { type: 'side-effect', isTypeOnly: false, firstId: './polyfill.js' },
        { type: 'side-effect', isTypeOnly: false, firstId: './styles.css' },
        { type: 'namespace', isTypeOnly: false, firstId: 'api' },
        { type: 'namespace', isTypeOnly: false, firstId: 'utils' },
        { type: 'default', isTypeOnly: false, firstId: 'Component' },
        { type: 'default', isTypeOnly: false, firstId: 'config' },
        { type: 'default', isTypeOnly: false, firstId: 'helper' },
        { type: 'default', isTypeOnly: true, firstId: 'Type' },
        { type: 'named', isTypeOnly: false, firstId: 'api' },
        { type: 'named', isTypeOnly: false, firstId: 'Button' },
        { type: 'named', isTypeOnly: true, firstId: 'Props' },
        { type: 'named', isTypeOnly: false, firstId: 'useState' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = sortImportsInGroup([]);
      expect(result).toEqual([]);
    });
    it('should handle single import', () => {
      const imports = [createMockImport('named', ['single'], 'module')];
      const result = sortImportsInGroup(imports);
      expect(result).toEqual(imports);
    });
  });
});
