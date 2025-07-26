import { describe, expect, it } from 'vitest';
import type {
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
} from 'estree';

import { extractImportInfo } from './utils/extract-import-info.js';
import type { FormattingPreferences } from './utils/types.js';
import { generateImportStatement } from './utils/generate-import-statement.js';

// Mock AST node creation helpers
function createMockNode(
  source: string,
  specifiers: (
    | ImportSpecifier
    | ImportDefaultSpecifier
    | ImportNamespaceSpecifier
  )[] = [],
  sourceText?: string,
): ImportDeclaration {
  // Calculate range based on sourceText length if provided, otherwise use a default
  const textLength = sourceText ? sourceText.length : 50;
  return {
    type: 'ImportDeclaration',
    attributes: [],
    source: {
      type: 'Literal',
      value: source,
      raw: `'${source}'`,
    },
    specifiers,
    range: [0, textLength],
    loc: {
      start: { line: 1, column: 0 },
      end: { line: 1, column: textLength },
    },
  };
}

function createImportSpecifier(name: string, local?: string): ImportSpecifier {
  return {
    type: 'ImportSpecifier',
    imported: { type: 'Identifier', name },
    local: { type: 'Identifier', name: local ?? name },
  };
}

function createDefaultSpecifier(name: string): ImportDefaultSpecifier {
  return {
    type: 'ImportDefaultSpecifier',
    local: { type: 'Identifier', name },
  };
}

const defaultPreferences: FormattingPreferences = {
  useSingleQuotes: true,
  useTrailingComma: false,
  maxLineLength: 80,
};

describe('Mixed type imports support', () => {
  describe('extractImportInfo with mixed type imports', () => {
    it('should detect individual type specifiers in mixed imports', () => {
      const node = createMockNode('./types', [
        createImportSpecifier('User'),
        createImportSpecifier('value'),
        createImportSpecifier('Config'),
      ]);

      const sourceText =
        "import { type User, value, type Config } from './types';";

      const result = extractImportInfo(node, sourceText);
      expect(result.isTypeOnly).toBe(false); // Not a full type-only import
      expect(result.type).toBe('named');
      expect(result.identifiers).toEqual([
        { imported: 'User', isTypeOnly: true },
        { imported: 'value' },
        { imported: 'Config', isTypeOnly: true },
      ]);
    });

    it('should handle type imports with aliases', () => {
      const sourceText =
        "import { type User as UserType, value, type Config as ConfigType } from './types';";

      const node = createMockNode(
        './types',
        [
          createImportSpecifier('User', 'UserType'),
          createImportSpecifier('value'),
          createImportSpecifier('Config', 'ConfigType'),
        ],
        sourceText,
      );

      const result = extractImportInfo(node, sourceText);

      expect(result.identifiers).toEqual([
        { imported: 'User', local: 'UserType', isTypeOnly: true },
        { imported: 'value' },
        { imported: 'Config', local: 'ConfigType', isTypeOnly: true },
      ]);
    });

    it('should handle mixed default and named type imports', () => {
      const sourceText =
        "import React, { type FC, useState, type Component } from 'react';";

      const node = createMockNode(
        'react',
        [
          createDefaultSpecifier('React'),
          createImportSpecifier('FC'),
          createImportSpecifier('useState'),
          createImportSpecifier('Component'),
        ],
        sourceText,
      );

      const result = extractImportInfo(node, sourceText);

      expect(result.type).toBe('default');
      expect(result.identifiers).toEqual([
        { imported: 'React' },
        { imported: 'FC', isTypeOnly: true },
        { imported: 'useState' },
        { imported: 'Component', isTypeOnly: true },
      ]);
    });

    it('should handle whitespace around type keywords', () => {
      const node = createMockNode('./types', [
        createImportSpecifier('User'),
        createImportSpecifier('value'),
      ]);
      const sourceText = "import {  type   User  ,   value  } from './types';";

      const result = extractImportInfo(node, sourceText);

      expect(result.identifiers).toEqual([
        { imported: 'User', isTypeOnly: true },
        { imported: 'value' },
      ]);
    });

    it('should handle all-type imports without statement-level type keyword', () => {
      const node = createMockNode('./types', [
        createImportSpecifier('User'),
        createImportSpecifier('Config'),
      ]);
      const sourceText = "import { type User, type Config } from './types';";

      const result = extractImportInfo(node, sourceText);

      expect(result.isTypeOnly).toBe(false); // Statement-level type is false
      expect(result.identifiers).toEqual([
        { imported: 'User', isTypeOnly: true },
        { imported: 'Config', isTypeOnly: true },
      ]);
    });

    it('should not confuse regular imports containing "type" in names', () => {
      const node = createMockNode('./types', [
        createImportSpecifier('UserType'),
        createImportSpecifier('typeHelper'),
      ]);
      const sourceText = "import { UserType, typeHelper } from './types';";

      const result = extractImportInfo(node, sourceText);

      expect(result.identifiers).toEqual([
        { imported: 'UserType' },
        { imported: 'typeHelper' },
      ]);
    });
  });

  describe('generateImportStatement with mixed type imports', () => {
    it('should preserve individual type keywords in mixed imports', () => {
      const importNode = {
        source: './types',
        text: "import { type User, value, type Config } from './types';",
        line: 1,
        type: 'named' as const,
        identifiers: [
          { imported: 'User', isTypeOnly: true },
          { imported: 'value', isTypeOnly: false },
          { imported: 'Config', isTypeOnly: true },
        ],
        isTypeOnly: false,
      };

      const result = generateImportStatement(importNode, defaultPreferences);

      expect(result).toBe(
        "import { type Config, type User, value } from './types';",
      );
    });

    it('should handle type imports with aliases in mixed imports', () => {
      const result = generateImportStatement(
        {
          source: './types',
          text: "import { type User as UserType, value, type Config as ConfigType } from './types';",
          line: 1,
          type: 'named',
          identifiers: [
            { imported: 'User', local: 'UserType', isTypeOnly: true },
            { imported: 'value', isTypeOnly: false },
            { imported: 'Config', local: 'ConfigType', isTypeOnly: true },
          ],
          isTypeOnly: false,
        },
        defaultPreferences,
      );
      expect(result).toBe(
        "import { type Config as ConfigType, type User as UserType, value } from './types';",
      );
    });

    it('should handle mixed default and named type imports', () => {
      const importNode = {
        source: 'react',
        text: "import React, { type FC, useState, type Component } from 'react';",
        line: 1,
        type: 'default' as const,
        identifiers: [
          { imported: 'React', isTypeOnly: false },
          { imported: 'FC', isTypeOnly: true },
          { imported: 'useState', isTypeOnly: false },
          { imported: 'Component', isTypeOnly: true },
        ],
        isTypeOnly: false,
      };

      const result = generateImportStatement(importNode, defaultPreferences);

      expect(result).toBe(
        "import React, { type Component, type FC, useState } from 'react';",
      );
    });

    it('should preserve trailing commas in mixed type imports', () => {
      const importNode = {
        source: './types',
        text: "import { type User, value, } from './types';",
        line: 1,
        type: 'named' as const,
        identifiers: [
          { imported: 'User', isTypeOnly: true },
          { imported: 'value', isTypeOnly: false },
        ],
        isTypeOnly: false,
      };

      const preferences: FormattingPreferences = {
        ...defaultPreferences,
        useTrailingComma: true,
      };

      const result = generateImportStatement(importNode, preferences);

      expect(result).toBe("import { type User, value, } from './types';");
    });

    it('should use statement-level type for full type imports', () => {
      // When all imports are type-only but using statement-level type keyword
      const importNode = {
        source: './types',
        text: "import type { User, Config } from './types';",
        line: 1,
        type: 'named' as const,
        identifiers: [
          { imported: 'User', isTypeOnly: false }, // No individual type flags
          { imported: 'Config', isTypeOnly: false },
        ],
        isTypeOnly: true, // Statement-level type
      };

      const result = generateImportStatement(importNode, defaultPreferences);

      expect(result).toBe("import type { Config, User } from './types';");
    });

    it('should handle multi-line mixed type imports', () => {
      const importNode = {
        source: './types',
        text: "import { type User, value, type Config, helper } from './types';",
        line: 1,
        type: 'named' as const,
        identifiers: [
          { imported: 'User', isTypeOnly: true },
          { imported: 'value', isTypeOnly: false },
          { imported: 'Config', isTypeOnly: true },
          { imported: 'helper', isTypeOnly: false },
        ],
        isTypeOnly: false,
      };

      const preferences: FormattingPreferences = {
        ...defaultPreferences,
        maxLineLength: 40, // Force multi-line
      };

      const result = generateImportStatement(importNode, preferences);

      expect(result).toBe(`import {
  type Config,
  helper,
  type User,
  value
} from './types';`);
    });
  });

  describe('mixed type import integration', () => {
    it('should handle complete mixed type import flow', () => {
      // Simulate extracting and regenerating a mixed type import
      const node = createMockNode('./types', [
        createImportSpecifier('User'),
        createImportSpecifier('value'),
        createImportSpecifier('Config'),
      ]);
      const sourceText =
        "import { type User, value, type Config } from './types';";

      // Extract information
      const extracted = extractImportInfo(node, sourceText);

      expect(extracted.isTypeOnly).toBe(false);
      expect(extracted.type).toBe('named');
      expect(extracted.identifiers).toHaveLength(3);

      // Generate sorted statement
      const generated = generateImportStatement(extracted, defaultPreferences);

      // Should sort alphabetically while preserving type keywords
      expect(generated).toBe(
        "import { type Config, type User, value } from './types';",
      );
    });

    it('should handle complex mixed import with default', () => {
      const sourceText =
        "import React, { useState, type FC, useEffect, type Component } from 'react';";

      const node = createMockNode(
        'react',
        [
          createDefaultSpecifier('React'),
          createImportSpecifier('useState'),
          createImportSpecifier('FC'),
          createImportSpecifier('useEffect'),
          createImportSpecifier('Component'),
        ],
        sourceText,
      );

      const extracted = extractImportInfo(node, sourceText);
      const generated = generateImportStatement(extracted, defaultPreferences);

      expect(generated).toBe(
        "import React, { type Component, type FC, useEffect, useState } from 'react';",
      );
    });
  });
});
