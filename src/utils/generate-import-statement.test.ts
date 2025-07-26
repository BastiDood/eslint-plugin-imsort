import { describe, it, expect } from 'vitest';

import type { ImportNode } from '../types.js';

import type { FormattingPreferences } from './types.js';
import { generateImportStatement } from './generate-import-statement.js';

// Helper function to create mock import nodes
function createMockImport(
  type: ImportNode['type'],
  identifiers: string[],
  source: string = 'test-module',
  isTypeOnly: boolean = false,
): ImportNode {
  return {
    source,
    text: '', // Not used in generation
    line: 1,
    type,
    identifiers,
    isTypeOnly,
  };
}

// Helper function to create formatting preferences
function createPreferences(
  useSingleQuotes: boolean = true,
  useTrailingComma: boolean = false,
  maxLineLength: number = 80,
): FormattingPreferences {
  return {
    useSingleQuotes,
    useTrailingComma,
    maxLineLength,
  };
}

describe('generateImportStatement', () => {
  describe('side-effect imports', () => {
    it('should generate basic side-effect import', () => {
      const importInfo = createMockImport('side-effect', [], 'polyfill');
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import 'polyfill';");
    });
    it('should generate side-effect import with double quotes', () => {
      const importInfo = createMockImport('side-effect', [], 'styles.css');
      const preferences = createPreferences(false);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe('import "styles.css";');
    });
    it('should generate type-only side-effect import', () => {
      const importInfo = createMockImport('side-effect', [], 'types', true);
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import type 'types';");
    });
  });
  describe('namespace imports', () => {
    it('should generate basic namespace import', () => {
      const importInfo = createMockImport('namespace', ['React'], 'react');
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import * as React from 'react';");
    });
    it('should generate namespace import with double quotes', () => {
      const importInfo = createMockImport('namespace', ['utils'], 'lodash');
      const preferences = createPreferences(false);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe('import * as utils from "lodash";');
    });
    it('should generate type-only namespace import', () => {
      const importInfo = createMockImport(
        'namespace',
        ['Types'],
        './types',
        true,
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import type * as Types from './types';");
    });
    it('should throw error for namespace import without identifier', () => {
      const importInfo = createMockImport('namespace', [], 'module');
      const preferences = createPreferences();
      expect(() => generateImportStatement(importInfo, preferences)).toThrow(
        'Namespace identifier is required',
      );
    });
  });
  describe('default imports', () => {
    it('should generate simple default import', () => {
      const importInfo = createMockImport('default', ['React'], 'react');
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import React from 'react';");
    });
    it('should generate default import with double quotes', () => {
      const importInfo = createMockImport('default', ['axios'], 'axios');
      const preferences = createPreferences(false);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe('import axios from "axios";');
    });
    it('should generate type-only default import', () => {
      const importInfo = createMockImport(
        'default',
        ['Component'],
        'react',
        true,
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import type Component from 'react';");
    });
    it('should throw error for default import without identifier', () => {
      const importInfo = createMockImport('default', [], 'module');
      const preferences = createPreferences();
      expect(() => generateImportStatement(importInfo, preferences)).toThrow(
        'Default identifier is required',
      );
    });
    describe('default + named imports', () => {
      it('should generate single-line default + named import', () => {
        const importInfo = createMockImport(
          'default',
          ['React', 'useState'],
          'react',
        );
        const preferences = createPreferences();
        const result = generateImportStatement(importInfo, preferences);
        expect(result).toBe("import React, { useState } from 'react';");
      });
      it('should sort named imports alphabetically', () => {
        const importInfo = createMockImport(
          'default',
          ['React', 'useState', 'useEffect'],
          'react',
        );
        const preferences = createPreferences();
        const result = generateImportStatement(importInfo, preferences);
        expect(result).toBe(
          "import React, { useEffect, useState } from 'react';",
        );
      });
      it('should add trailing comma when preferred', () => {
        const importInfo = createMockImport(
          'default',
          ['React', 'useState'],
          'react',
        );
        const preferences = createPreferences(true, true);
        const result = generateImportStatement(importInfo, preferences);
        expect(result).toBe("import React, { useState, } from 'react';");
      });
      it('should use multiline format for long imports', () => {
        const importInfo = createMockImport(
          'default',
          [
            'React',
            'useState',
            'useEffect',
            'useCallback',
            'useMemo',
            'useRef',
          ],
          'react',
        );
        const preferences = createPreferences(true, false, 40); // Short line length
        const result = generateImportStatement(importInfo, preferences);
        expect(result).toBe(
          "import React, {\n  useCallback,\n  useEffect,\n  useMemo,\n  useRef,\n  useState\n} from 'react';",
        );
      });
      it('should use multiline format with trailing comma', () => {
        const importInfo = createMockImport(
          'default',
          ['React', 'useState', 'useEffect'],
          'react',
        );
        const preferences = createPreferences(true, true, 30); // Very short line length
        const result = generateImportStatement(importInfo, preferences);
        expect(result).toBe(
          "import React, {\n  useEffect,\n  useState,\n} from 'react';",
        );
      });
    });
  });
  describe('named imports', () => {
    it('should generate simple named import', () => {
      const importInfo = createMockImport('named', ['useState'], 'react');
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import { useState } from 'react';");
    });
    it('should sort named imports alphabetically', () => {
      const importInfo = createMockImport(
        'named',
        ['useState', 'useEffect', 'useCallback'],
        'react',
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import { useCallback, useEffect, useState } from 'react';",
      );
    });
    it('should add trailing comma when preferred', () => {
      const importInfo = createMockImport('named', ['useState'], 'react');
      const preferences = createPreferences(true, true);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import { useState, } from 'react';");
    });
    it('should use single line for 3 or fewer imports regardless of length', () => {
      const importInfo = createMockImport(
        'named',
        [
          'veryLongImportName',
          'anotherVeryLongImportName',
          'thirdVeryLongImportName',
        ],
        'module',
      );
      const preferences = createPreferences(true, false, 20); // Very short line length
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import { anotherVeryLongImportName, thirdVeryLongImportName, veryLongImportName } from 'module';",
      );
    });
    it('should use multiline format for long imports with many identifiers', () => {
      const importInfo = createMockImport(
        'named',
        ['useState', 'useEffect', 'useCallback', 'useMemo'],
        'react',
      );
      const preferences = createPreferences(true, false, 40); // Short line length
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import {\n  useCallback,\n  useEffect,\n  useMemo,\n  useState\n} from 'react';",
      );
    });
    it('should use multiline format with trailing comma', () => {
      const importInfo = createMockImport(
        'named',
        ['useState', 'useEffect', 'useCallback', 'useMemo'],
        'react',
      );
      const preferences = createPreferences(true, true, 40);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import {\n  useCallback,\n  useEffect,\n  useMemo,\n  useState,\n} from 'react';",
      );
    });
    it('should generate type-only named import', () => {
      const importInfo = createMockImport(
        'named',
        ['Props', 'State'],
        './types',
        true,
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import type { Props, State } from './types';");
    });
  });
  describe('quote style handling', () => {
    it('should use single quotes when preferred', () => {
      const importInfo = createMockImport('default', ['test'], 'module');
      const preferences = createPreferences(true);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import test from 'module';");
    });
    it('should use double quotes when preferred', () => {
      const importInfo = createMockImport('default', ['test'], 'module');
      const preferences = createPreferences(false);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe('import test from "module";');
    });
  });
  describe('natural sorting', () => {
    it('should sort identifiers naturally with numbers', () => {
      const importInfo = createMockImport(
        'named',
        ['item10', 'item2', 'item1', 'item20'],
        'module',
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import { item1, item2, item10, item20 } from 'module';",
      );
    });
    it('should sort case-insensitively', () => {
      const importInfo = createMockImport(
        'named',
        ['Zeus', 'alpha', 'Beta', 'charlie'],
        'module',
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import { alpha, Beta, charlie, Zeus } from 'module';",
      );
    });
  });
  describe('edge cases', () => {
    it('should handle empty identifiers array for named imports', () => {
      const importInfo = createMockImport('named', [], 'module');
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import {  } from 'module';");
    });
    it('should fallback to original text for unknown import types', () => {
      const importInfo: ImportNode = {
        source: 'module',
        text: 'import something from "module";',
        line: 1,
        type: 'unknown' as any, // Invalid type
        identifiers: [],
        isTypeOnly: false,
      };
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe('import something from "module";');
    });
    it('should handle special characters in module names', () => {
      const importInfo = createMockImport(
        'default',
        ['component'],
        '@/components/ui/button',
      );
      const preferences = createPreferences();
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe("import component from '@/components/ui/button';");
    });
    it('should handle very long single import name', () => {
      const importInfo = createMockImport(
        'named',
        ['veryVeryVeryLongImportNameThatExceedsTypicalLineLengths'],
        'module',
      );
      const preferences = createPreferences(true, false, 40);
      const result = generateImportStatement(importInfo, preferences);
      // Should still be single line for one import
      expect(result).toBe(
        "import { veryVeryVeryLongImportNameThatExceedsTypicalLineLengths } from 'module';",
      );
    });
  });
  describe('complex real-world scenarios', () => {
    it('should handle React component imports', () => {
      const importInfo = createMockImport(
        'default',
        ['React', 'Component', 'PureComponent', 'useState', 'useEffect'],
        'react',
      );
      const preferences = createPreferences(true, true, 80);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import React, { Component, PureComponent, useEffect, useState, } from 'react';",
      );
    });
    it('should handle utility library imports', () => {
      const importInfo = createMockImport(
        'named',
        ['debounce', 'throttle', 'map', 'filter', 'reduce'],
        'lodash',
      );
      const preferences = createPreferences(false, false, 60);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        'import {\n  debounce,\n  filter,\n  map,\n  reduce,\n  throttle\n} from "lodash";',
      );
    });
    it('should handle TypeScript type imports', () => {
      const importInfo = createMockImport(
        'named',
        ['FC', 'ReactNode', 'PropsWithChildren'],
        'react',
        true,
      );
      const preferences = createPreferences(true, true);
      const result = generateImportStatement(importInfo, preferences);
      expect(result).toBe(
        "import type { FC, PropsWithChildren, ReactNode, } from 'react';",
      );
    });
  });
});
