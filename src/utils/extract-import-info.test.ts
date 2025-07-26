import { describe, it, expect } from 'vitest';
import type {
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  Identifier,
} from 'estree';

import { extractImportInfo } from './extract-import-info.js';

// Helper to create mock AST nodes
function createMockNode(
  source: string,
  specifiers: (
    | ImportSpecifier
    | ImportDefaultSpecifier
    | ImportNamespaceSpecifier
  )[] = [],
  range: [number, number] = [0, 50],
  line = 1,
): ImportDeclaration {
  return {
    attributes: [],
    type: 'ImportDeclaration',
    source: {
      type: 'Literal',
      value: source,
      raw: `'${source}'`,
    },
    specifiers,
    range,
    loc: {
      start: { line, column: 0 },
      end: { line, column: 50 },
    },
  };
}

function createIdentifier(name: string): Identifier {
  return {
    type: 'Identifier',
    name,
  };
}

function createImportSpecifier(
  imported: string,
  local?: string,
): ImportSpecifier {
  return {
    type: 'ImportSpecifier',
    imported: createIdentifier(imported),
    local: createIdentifier(local || imported),
  };
}

function createDefaultSpecifier(local: string): ImportDefaultSpecifier {
  return {
    type: 'ImportDefaultSpecifier',
    local: createIdentifier(local),
  };
}

function createNamespaceSpecifier(local: string): ImportNamespaceSpecifier {
  return {
    type: 'ImportNamespaceSpecifier',
    local: createIdentifier(local),
  };
}

describe('extractImportInfo', () => {
  describe('basic functionality', () => {
    it('should extract basic import information', () => {
      const node = createMockNode('react', [createDefaultSpecifier('React')]);
      const sourceText = "import React from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result).toEqual({
        source: 'react',
        text: "import React from 'react';",
        line: 1,
        type: 'default',
        identifiers: [{ imported: 'React' }],
        isTypeOnly: false,
      });
    });
    it('should handle different line numbers', () => {
      const node = createMockNode(
        'lodash',
        [createDefaultSpecifier('_')],
        [0, 30],
        5,
      );
      const sourceText = "import _ from 'lodash';";
      const result = extractImportInfo(node, sourceText);
      expect(result.line).toBe(5);
    });
    it('should extract text from correct range', () => {
      const node = createMockNode(
        'react',
        [createDefaultSpecifier('React')],
        [10, 40],
      );
      const sourceText = "// comment\nimport React from 'react';\n// more";
      const result = extractImportInfo(node, sourceText);
      expect(result.text).toBe("\nimport React from 'react';\n//");
    });
  });
  describe('side-effect imports', () => {
    it('should detect side-effect imports', () => {
      const node = createMockNode('polyfill', []);
      const sourceText = "import 'polyfill';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('side-effect');
      expect(result.identifiers).toEqual([]);
    });
    it('should handle CSS imports', () => {
      const node = createMockNode('./styles.css', []);
      const sourceText = "import './styles.css';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('side-effect');
      expect(result.source).toBe('./styles.css');
    });
  });
  describe('namespace imports', () => {
    it('should detect namespace imports', () => {
      const node = createMockNode('react', [createNamespaceSpecifier('React')]);
      const sourceText = "import * as React from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('namespace');
      expect(result.identifiers).toEqual([{ imported: 'React' }]);
    });
    it('should handle utility namespace imports', () => {
      const node = createMockNode('lodash', [createNamespaceSpecifier('_')]);
      const sourceText = "import * as _ from 'lodash';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('namespace');
      expect(result.identifiers).toEqual([{ imported: '_' }]);
      expect(result.source).toBe('lodash');
    });
  });
  describe('default imports', () => {
    it('should detect default imports', () => {
      const node = createMockNode('react', [createDefaultSpecifier('React')]);
      const sourceText = "import React from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([{ imported: 'React' }]);
    });
    it('should handle default + named imports', () => {
      const node = createMockNode('react', [
        createDefaultSpecifier('React'),
        createImportSpecifier('useState'),
        createImportSpecifier('useEffect'),
      ]);
      const sourceText = "import React, { useState, useEffect } from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([
        { imported: 'React' },
        { imported: 'useState', local: undefined },
        { imported: 'useEffect', local: undefined },
      ]);
    });
    it('should handle aliased named imports with default', () => {
      const node = createMockNode('react', [
        createDefaultSpecifier('React'),
        {
          type: 'ImportSpecifier',
          imported: createIdentifier('useState'),
          local: createIdentifier('useStateHook'),
        },
      ]);
      const sourceText =
        "import React, { useState as useStateHook } from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([
        { imported: 'React' },
        { imported: 'useState', local: 'useStateHook' },
      ]);
    });
  });
  describe('named imports', () => {
    it('should detect named imports', () => {
      const node = createMockNode('react', [
        createImportSpecifier('useState'),
        createImportSpecifier('useEffect'),
      ]);
      const sourceText = "import { useState, useEffect } from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'useState', local: undefined },
        { imported: 'useEffect', local: undefined },
      ]);
    });
    it('should handle single named import', () => {
      const node = createMockNode('lodash', [
        createImportSpecifier('debounce'),
      ]);
      const sourceText = "import { debounce } from 'lodash';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'debounce', local: undefined },
      ]);
    });
    it('should handle many named imports', () => {
      const node = createMockNode('lodash', [
        createImportSpecifier('map'),
        createImportSpecifier('filter'),
        createImportSpecifier('reduce'),
        createImportSpecifier('forEach'),
      ]);
      const sourceText =
        "import { map, filter, reduce, forEach } from 'lodash';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'map', local: undefined },
        { imported: 'filter', local: undefined },
        { imported: 'reduce', local: undefined },
        { imported: 'forEach', local: undefined },
      ]);
    });
  });
  describe('TypeScript type imports', () => {
    it('should detect type-only imports from source text', () => {
      const node = createMockNode('./types', [createImportSpecifier('User')]);
      const sourceText = "import type { User } from './types';";
      const result = extractImportInfo(node, sourceText);
      expect(result.isTypeOnly).toBe(true);
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'User', local: undefined },
      ]);
    });
    it('should detect type imports with whitespace', () => {
      const node = createMockNode('./types', [createDefaultSpecifier('Types')]);
      const sourceText = "  import   type   Types from './types';";
      const result = extractImportInfo(node, sourceText);
      expect(result.isTypeOnly).toBe(true);
      expect(result.type).toBe('default');
    });
    it('should not detect regular imports as type-only', () => {
      const node = createMockNode('react', [createDefaultSpecifier('React')]);
      const sourceText = "import React from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.isTypeOnly).toBe(false);
    });
    it('should handle type in import content but not at start', () => {
      const node = createMockNode('./types', [
        createImportSpecifier('UserType'),
      ]);
      const sourceText =
        "import { UserType } from './types'; // This has type in it";
      const result = extractImportInfo(node, sourceText);
      expect(result.isTypeOnly).toBe(false);
    });
  });
  describe('error handling', () => {
    it('should throw error for non-string import source', () => {
      const node = createMockNode('', []);
      node.source.value = 123; // Invalid source
      expect(() => extractImportInfo(node, 'import test;')).toThrow(
        'Import source must be a string',
      );
    });
    it('should throw error for missing range', () => {
      const node = createMockNode('react', []);
      node.range = void 0;
      expect(() => extractImportInfo(node, "import 'react';")).toThrow(
        'Node must have range and location information',
      );
    });
    it('should throw error for missing location', () => {
      const node = createMockNode('react', []);
      node.loc = null;
      expect(() => extractImportInfo(node, "import 'react';")).toThrow(
        'Node must have range and location information',
      );
    });
    it('should throw error for undefined location', () => {
      const node = createMockNode('react', []);
      node.loc = void 0;
      expect(() => extractImportInfo(node, "import 'react';")).toThrow(
        'Node must have range and location information',
      );
    });
  });
  describe('edge cases and complex scenarios', () => {
    it('should handle imports with no specifiers gracefully', () => {
      const node = createMockNode('side-effect-module', []);
      const sourceText = "import 'side-effect-module';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('side-effect');
      expect(result.identifiers).toEqual([]);
    });
    it('should prioritize namespace over other types', () => {
      // This shouldn't happen in real code, but tests type precedence
      const node = createMockNode('module', [
        createNamespaceSpecifier('All'),
        createDefaultSpecifier('Default'),
      ]);
      const sourceText = "import Default, * as All from 'module';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('namespace');
      expect(result.identifiers).toEqual([{ imported: 'All' }]);
    });
    it('should prioritize default over named when both present', () => {
      const node = createMockNode('module', [
        createDefaultSpecifier('Default'),
        createImportSpecifier('named'),
      ]);
      const sourceText = "import Default, { named } from 'module';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([
        { imported: 'Default' },
        { imported: 'named', local: undefined },
      ]);
    });
    it('should handle mixed import specifier types', () => {
      const node = createMockNode('react', [
        createDefaultSpecifier('React'),
        createImportSpecifier('Component'),
        createImportSpecifier('useState'),
      ]);
      const sourceText = "import React, { Component, useState } from 'react';";
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([
        { imported: 'React' },
        { imported: 'Component', local: undefined },
        { imported: 'useState', local: undefined },
      ]);
    });
    it('should handle imports with complex source paths', () => {
      const node = createMockNode('@/components/ui/button', [
        createDefaultSpecifier('Button'),
      ]);
      const sourceText = "import Button from '@/components/ui/button';";
      const result = extractImportInfo(node, sourceText);
      expect(result.source).toBe('@/components/ui/button');
      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([{ imported: 'Button' }]);
    });
    it('should handle imports with relative paths', () => {
      const node = createMockNode('../../../utils/helpers', [
        createImportSpecifier('formatDate'),
        createImportSpecifier('parseUrl'),
      ]);
      const sourceText =
        "import { formatDate, parseUrl } from '../../../utils/helpers';";
      const result = extractImportInfo(node, sourceText);
      expect(result.source).toBe('../../../utils/helpers');
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'formatDate', local: undefined },
        { imported: 'parseUrl', local: undefined },
      ]);
    });
    it('should filter out non-identifier imports', () => {
      // Create a mock specifier with a non-identifier imported value
      const mockSpecifier: ImportSpecifier = {
        type: 'ImportSpecifier',
        imported: {
          type: 'Literal',
          value: 'not-an-identifier',
          raw: '"not-an-identifier"',
        },
        local: createIdentifier('local'),
      };
      const node = createMockNode('module', [
        createImportSpecifier('validImport'),
        mockSpecifier,
      ]);
      const sourceText = "import { validImport } from 'module';";
      const result = extractImportInfo(node, sourceText);
      expect(result.identifiers).toEqual([
        { imported: 'validImport', local: undefined },
      ]); // Should filter out non-identifier
    });
    it('should handle very long import statements', () => {
      const longIdentifiers = Array.from(
        { length: 20 },
        (_, i) => `identifier${i + 1}`,
      );
      const specifiers = longIdentifiers.map(id => createImportSpecifier(id));
      const node = createMockNode('large-module', specifiers);
      const sourceText = `import { ${longIdentifiers.join(', ')} } from 'large-module';`;
      const result = extractImportInfo(node, sourceText);
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual(
        longIdentifiers.map(name => ({ imported: name, local: undefined })),
      );
      expect(result.identifiers).toHaveLength(20);
    });
  });
  describe('real-world import patterns', () => {
    it('should handle React import patterns', () => {
      const sourceText =
        "import React, { useState, useEffect, useCallback } from 'react';";
      const node = createMockNode(
        'react',
        [
          createDefaultSpecifier('React'),
          createImportSpecifier('useState'),
          createImportSpecifier('useEffect'),
          createImportSpecifier('useCallback'),
        ],
        [0, sourceText.length],
      );
      const result = extractImportInfo(node, sourceText);
      expect(result).toEqual({
        source: 'react',
        text: "import React, { useState, useEffect, useCallback } from 'react';",
        line: 1,
        type: 'default',
        identifiers: [
          { imported: 'React' },
          { imported: 'useState', local: undefined },
          { imported: 'useEffect', local: undefined },
          { imported: 'useCallback', local: undefined },
        ],
        isTypeOnly: false,
      });
    });
    it('should handle utility library imports', () => {
      const node = createMockNode('lodash/fp', [
        createImportSpecifier('map'),
        createImportSpecifier('filter'),
        createImportSpecifier('compose'),
      ]);
      const sourceText = "import { map, filter, compose } from 'lodash/fp';";
      const result = extractImportInfo(node, sourceText);
      expect(result.source).toBe('lodash/fp');
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'map', local: undefined },
        { imported: 'filter', local: undefined },
        { imported: 'compose', local: undefined },
      ]);
    });
    it('should handle TypeScript declaration imports', () => {
      const node = createMockNode('@types/node', [
        createImportSpecifier('Buffer'),
        createImportSpecifier('Process'),
      ]);
      const sourceText = "import type { Buffer, Process } from '@types/node';";
      const result = extractImportInfo(node, sourceText);
      expect(result.isTypeOnly).toBe(true);
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'Buffer', local: undefined },
        { imported: 'Process', local: undefined },
      ]);
    });
  });
});
