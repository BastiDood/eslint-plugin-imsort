import type { ImportIdentifier, ImportNode } from '../types.ts';

function formatIdentifierKey(id: ImportIdentifier) {
  const localSuffix = typeof id.local === 'undefined' ? '' : `:${id.local}`;
  const typeSuffix = id.isTypeOnly === true ? ':type' : '';
  return `${id.imported}${localSuffix}${typeSuffix}`;
}

function formatIdentifiersKey(identifiers: ImportIdentifier[]) {
  return identifiers.map(formatIdentifierKey).join(',');
}

/** Generates a unique key for an import node (used for indentation mapping) */
export function generateImportKey(importInfo: ImportNode) {
  return `${importInfo.source}:${importInfo.type}:${formatIdentifiersKey(importInfo.identifiers)}`;
}
