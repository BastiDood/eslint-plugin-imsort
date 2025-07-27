import type { ImportDeclaration } from 'estree';

import type { ImportIdentifier, ImportNode, ImportType } from '../types.ts';

/**
 * Parses individual type specifiers from import statement text
 * Returns a set of identifier names that have the 'type' keyword
 */
function parseIndividualTypeSpecifiers(text: string): Set<string> {
  const typeSpecifiers = new Set<string>();

  // Match import statement content between braces
  const braceMatch = text.match(/\{\s*([^}]+)\s*\}/u);
  if (typeof braceMatch === 'undefined' || braceMatch === null)
    return typeSpecifiers;

  const [_, importContent] = braceMatch;
  if (typeof importContent === 'undefined') return typeSpecifiers;

  // Split by commas and analyze each specifier
  const specifiers = importContent.split(',').map(s => s.trim());

  for (const specifier of specifiers) {
    // Match patterns like "type User", "type Config as ConfigType"
    // Updated regex to be more flexible with whitespace and capture the identifier name
    const typeMatch = specifier.match(/^\s*type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/u);
    if (typeMatch !== null && typeof typeMatch[1] !== 'undefined')
      typeSpecifiers.add(typeMatch[1]);
  }

  return typeSpecifiers;
}

/** Extracts import information from an import declaration node */
export function extractImportInfo(
  node: ImportDeclaration,
  sourceText: string,
): ImportNode {
  if (typeof node.source.value !== 'string')
    throw new Error('Import source must be a string');

  const source = node.source.value;

  if (
    typeof node.range === 'undefined' ||
    node.loc === null ||
    typeof node.loc === 'undefined'
  )
    throw new Error('Node must have range and location information');

  const text = sourceText.slice(node.range[0], node.range[1]);
  const { line } = node.loc.start;

  // Check for TypeScript type-only imports
  // Use AST importKind if available (TypeScript parser), otherwise fall back to regex
  const isTypeOnly =
    // @ts-expect-error - importKind is available with TypeScript parser
    node.importKind === 'type' || /^\s*import\s+type\s+/u.test(text);

  // Parse individual type specifiers for mixed imports
  const individualTypeSpecifiers = parseIndividualTypeSpecifiers(text);

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let type: ImportType;
  const identifiers: ImportIdentifier[] = [];

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
      const identifier: ImportIdentifier = {
        imported: namespaceSpec.local.name,
      };
      if (isTypeOnly || individualTypeSpecifiers.has(namespaceSpec.local.name))
        identifier.isTypeOnly = true;

      identifiers.push(identifier);
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
      const identifier: ImportIdentifier = {
        imported: defaultSpec.local.name,
      };
      if (isTypeOnly || individualTypeSpecifiers.has(defaultSpec.local.name))
        identifier.isTypeOnly = true;

      identifiers.push(identifier);
    }

    // Add named imports after default
    const namedSpecs = node.specifiers.filter(
      spec => spec.type === 'ImportSpecifier',
    );
    for (const spec of namedSpecs)
      if (
        spec.type === 'ImportSpecifier' &&
        spec.imported.type === 'Identifier'
      ) {
        const imported = spec.imported.name;
        const local = spec.local.name;
        const identifier: ImportIdentifier = {
          imported,
        };
        if (imported !== local) identifier.local = local;

        if (isTypeOnly || individualTypeSpecifiers.has(imported))
          identifier.isTypeOnly = true;

        identifiers.push(identifier);
      }
  } else {
    // Named imports only: import { a, b } from 'module'
    type = 'named';
    const namedSpecs = node.specifiers.filter(
      spec => spec.type === 'ImportSpecifier',
    );
    for (const spec of namedSpecs)
      if (
        spec.type === 'ImportSpecifier' &&
        spec.imported.type === 'Identifier'
      ) {
        const imported = spec.imported.name;
        const local = spec.local.name;
        const identifier: ImportIdentifier = {
          imported,
        };
        if (imported !== local) identifier.local = local;

        if (isTypeOnly || individualTypeSpecifiers.has(imported))
          identifier.isTypeOnly = true;

        identifiers.push(identifier);
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
