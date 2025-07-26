import type { ImportDeclaration } from 'estree';

import type {
  ImportNode,
  ImportType,
  ImportTypeOrder,
  FormattingPreferences,
} from './types.js';

/** Determines the import group priority based on the import source */
export function getImportGroupPriority(source: string): number {
  // Runtime-namespaced imports (node:, bun:, deno:, cloudflare:, etc.)
  if (/^(node|bun|deno|cloudflare|workerd|wrangler):/iu.test(source)) {
    return 0;
  }

  // Registry-namespaced imports (npm:, jsr:, etc.)
  if (/^(npm|jsr|esm|unpkg|cdn):/iu.test(source)) {
    return 1;
  }

  // Generic namespaced imports (anything with namespace:)
  if (/^[a-zA-Z][a-zA-Z0-9_-]*:/iu.test(source)) {
    return 2;
  }

  // Custom-aliased imports (@/*, ~*, etc.)
  if (/^[@~]/iu.test(source)) {
    return 4;
  }

  // Relative imports starting with ./
  if (source.startsWith('./')) {
    return 6;
  }

  // Parent-relative imports (../, ../../, etc.) - calculate depth
  const parentMatches = source.match(/^(\.\.\/)+/);
  if (parentMatches) {
    const depth = parentMatches[0].split('../').length - 1;
    return 5000 - depth; // Higher depth = higher priority within parent-relative group
  }

  // Single .. import
  if (source === '..') {
    return 5001;
  }

  // Non-namespaced bare imports (react, express, @types/*, etc.)
  return 3;
}

/** Extracts import information from an import declaration node */
export function extractImportInfo(
  node: ImportDeclaration,
  sourceText: string,
): ImportNode {
  if (typeof node.source.value !== 'string') {
    throw new Error('Import source must be a string');
  }

  const source = node.source.value;

  if (
    typeof node.range === 'undefined' ||
    node.loc === null ||
    typeof node.loc === 'undefined'
  ) {
    throw new Error('Node must have range and location information');
  }

  const text = sourceText.slice(node.range[0], node.range[1]);
  const line = node.loc.start.line;

  // Check for TypeScript type-only imports
  // In TypeScript AST, this would be available as node.importKind === 'type'
  // For now, we'll detect it from the source text
  const isTypeOnly = /^\s*import\s+type\s+/.test(text);

  let type: ImportType = 'named';
  const identifiers: string[] = [];

  if (node.specifiers.length === 0) {
    // Side-effect import: import 'module'
    type = 'side-effect';
  } else if (
    node.specifiers.some(spec => spec.type === 'ImportNamespaceSpecifier')
  ) {
    // Namespace import: import * as name from 'module'
    type = 'namespace';
    const namespaceSpec = node.specifiers.find(
      spec => spec.type === 'ImportNamespaceSpecifier',
    );
    if (namespaceSpec && namespaceSpec.type === 'ImportNamespaceSpecifier') {
      identifiers.push(namespaceSpec.local.name);
    }
  } else if (
    node.specifiers.some(spec => spec.type === 'ImportDefaultSpecifier')
  ) {
    // Default import: import name from 'module' (may also have named imports)
    type = 'default';
    const defaultSpec = node.specifiers.find(
      spec => spec.type === 'ImportDefaultSpecifier',
    );
    if (defaultSpec && defaultSpec.type === 'ImportDefaultSpecifier') {
      identifiers.push(defaultSpec.local.name);
    }
    // Add named imports after default
    const namedSpecs = node.specifiers.filter(
      spec => spec.type === 'ImportSpecifier',
    );
    for (const spec of namedSpecs) {
      if (
        spec.type === 'ImportSpecifier' &&
        spec.imported.type === 'Identifier'
      ) {
        identifiers.push(spec.imported.name);
      }
    }
  } else {
    // Named imports only: import { a, b } from 'module'
    type = 'named';
    const namedSpecs = node.specifiers.filter(
      spec => spec.type === 'ImportSpecifier',
    );
    for (const spec of namedSpecs) {
      if (
        spec.type === 'ImportSpecifier' &&
        spec.imported.type === 'Identifier'
      ) {
        identifiers.push(spec.imported.name);
      }
    }
  }

  return {
    source,
    text,
    line,
    type,
    identifiers,
    isTypeOnly,
  };
}

/** Sorts imports within a group */
export function sortImportsInGroup(imports: ImportNode[]) {
  return imports.sort((a, b) => {
    // First sort by import type priority
    const typeOrder: ImportTypeOrder = {
      'side-effect': 0, // Side-effect imports floated to top
      namespace: 1,
      default: 2,
      named: 3,
    };
    const aTypeOrder = typeOrder[a.type] ?? 999;
    const bTypeOrder = typeOrder[b.type] ?? 999;
    const typeDiff = aTypeOrder - bTypeOrder;
    if (typeDiff !== 0) return typeDiff;

    // Then sort by first identifier (or source for side-effect imports)
    const [aFirstId = a.source] = a.identifiers;
    const [bFirstId = b.source] = b.identifiers;

    if (typeof aFirstId === 'undefined' || typeof bFirstId === 'undefined') {
      return 0;
    }

    return aFirstId.localeCompare(bFirstId, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

/**
 * Detects formatting preferences from the source code
 */
export function detectFormattingPreferences(
  sourceText: string,
): FormattingPreferences {
  // Detect quote preference by counting occurrences without global flag
  let singleQuoteCount = 0;
  let doubleQuoteCount = 0;

  // Count single quote imports
  let searchIndex = 0;
  const singleQuotePattern = /import[^']*'[^']*/iu;
  while (searchIndex < sourceText.length) {
    const match = sourceText.slice(searchIndex).search(singleQuotePattern);
    if (match === -1) break;
    singleQuoteCount++;
    searchIndex += match + 1;
  }

  // Count double quote imports
  searchIndex = 0;
  const doubleQuotePattern = /import[^"]*"[^"]*/iu;
  while (searchIndex < sourceText.length) {
    const match = sourceText.slice(searchIndex).search(doubleQuotePattern);
    if (match === -1) break;
    doubleQuoteCount++;
    searchIndex += match + 1;
  }

  // Detect trailing comma preference
  const hasTrailingComma = /import\s*\{[^}]*,\s*\}\s*from/iu.test(sourceText);

  return {
    useSingleQuotes: singleQuoteCount > doubleQuoteCount,
    useTrailingComma: hasTrailingComma,
    maxLineLength: 80, // Default, could be enhanced to detect from existing code
  };
}

/**
 * Generates the corrected import statement with improved formatting
 */
export function generateImportStatement(
  importInfo: ImportNode,
  preferences: FormattingPreferences,
) {
  const { source, type, identifiers, isTypeOnly } = importInfo;
  const typePrefix = isTypeOnly ? 'type ' : '';
  const quote = preferences.useSingleQuotes ? "'" : '"';

  switch (type) {
    case 'side-effect':
      return `import ${typePrefix}${quote}${source}${quote};`;

    case 'namespace': {
      const identifier = identifiers[0];
      if (typeof identifier === 'undefined') {
        throw new Error('Namespace identifier is required');
      }
      return `import ${typePrefix}* as ${identifier} from ${quote}${source}${quote};`;
    }

    case 'default': {
      if (identifiers.length === 1) {
        const identifier = identifiers[0];
        if (typeof identifier === 'undefined') {
          throw new Error('Default identifier is required');
        }
        return `import ${typePrefix}${identifier} from ${quote}${source}${quote};`;
      } else {
        // Default + named imports
        const [defaultId, ...namedIds] = identifiers;
        if (typeof defaultId === 'undefined') {
          throw new Error('Default identifier is required');
        }
        const sortedNamed = [...namedIds].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        );

        // Format based on length and preferences
        const namedImportsStr = sortedNamed.join(', ');
        const singleLineImport = `import ${typePrefix}${defaultId}, { ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;

        if (singleLineImport.length <= preferences.maxLineLength) {
          return singleLineImport;
        }

        // Multi-line format for long imports
        const formattedNamed = sortedNamed.map(name => `  ${name}`).join(',\n');
        return `import ${typePrefix}${defaultId}, {\n${formattedNamed}${preferences.useTrailingComma ? ',' : ''}\n} from ${quote}${source}${quote};`;
      }
    }

    case 'named': {
      const sortedIds = [...identifiers].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
      );

      // Format based on length and preferences
      const namedImportsStr = sortedIds.join(', ');
      const singleLineImport = `import ${typePrefix}{ ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;

      if (
        singleLineImport.length <= preferences.maxLineLength ||
        sortedIds.length <= 3
      ) {
        return singleLineImport;
      }

      // Multi-line format for long imports
      const formattedIds = sortedIds.map(name => `  ${name}`).join(',\n');
      return `import ${typePrefix}{\n${formattedIds}${preferences.useTrailingComma ? ',' : ''}\n} from ${quote}${source}${quote};`;
    }

    default:
      return importInfo.text;
  }
}
