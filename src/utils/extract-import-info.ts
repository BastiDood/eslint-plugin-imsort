import type { ImportDeclaration } from 'estree';

import type { ImportNode, ImportType } from '../types.ts';

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
