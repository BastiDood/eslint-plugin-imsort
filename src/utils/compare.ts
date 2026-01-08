import type { ImportGroupClassification, ImportIdentifier } from '../types.ts';

function compareStrings(a: string, b: string, mode: 'base' | 'variant') {
  return a.localeCompare(b, void 0, { numeric: true, sensitivity: mode });
}

/** Compare identifiers with case-insensitive, numeric-aware comparison */
export function compareIdentifiers(a: string, b: string) {
  return compareStrings(a, b, 'base');
}

/** Compare source paths with case-sensitive, numeric-aware comparison */
export function compareSources(a: string, b: string) {
  return compareStrings(a, b, 'variant');
}

/** Check if two identifiers are equal (same imported name and type-only status) */
export function areIdentifiersEqual(a: ImportIdentifier, b: ImportIdentifier) {
  return (
    a.imported === b.imported &&
    (a.isTypeOnly ?? false) === (b.isTypeOnly ?? false)
  );
}

/** Default group ordering (matches current behavior) */
const GROUP_ORDER = [
  'runtime-namespaced',
  'registry-namespaced',
  'generic-namespaced',
  'bare-import',
  'dollar-aliased',
  'tilde-aliased',
  'at-aliased',
  'parent-relative',
  'current-directory',
] as const;

/** Compare two import group classifications for sorting */
export function compareImportGroups(
  a: ImportGroupClassification,
  b: ImportGroupClassification,
) {
  const aIndex = GROUP_ORDER.indexOf(a.kind);
  const bIndex = GROUP_ORDER.indexOf(b.kind);

  if (aIndex !== bIndex) return aIndex - bIndex;

  // Same group kind - compare by depth for relative imports
  switch (a.kind) {
    case 'parent-relative': {
      if (b.kind !== 'parent-relative')
        throw new Error(
          `Expected b.kind to be 'parent-relative', got '${b.kind}'`,
        );
      // Deeper paths come first (e.g., ../../ before ../)
      return b.depth - a.depth;
    }
    case 'current-directory': {
      if (b.kind !== 'current-directory')
        throw new Error(
          `Expected b.kind to be 'current-directory', got '${b.kind}'`,
        );
      // Shallower paths come first (e.g., ./ before ./deep/)
      return a.depth - b.depth;
    }
    default:
      return 0;
  }
}

export class UnknownImportGroupKindError extends Error {
  constructor() {
    super(`Unknown import group kind`);
    this.name = 'UnknownImportGroupKindError';
  }
}

/** Get numeric group key for an import classification (for Map grouping) */
export function getGroupKey(classification: ImportGroupClassification) {
  switch (classification.kind) {
    case 'runtime-namespaced':
      return 0;
    case 'registry-namespaced':
      return 1;
    case 'generic-namespaced':
      return 2;
    case 'bare-import':
      return 3;
    case 'dollar-aliased':
      return 4;
    case 'tilde-aliased':
      // Non-root (~shared/) = 4, root (~/) = 5
      return classification.isRoot ? 5 : 4;
    case 'at-aliased':
      return 5;
    case 'parent-relative':
      // Deeper parent paths come first (e.g., ../../ before ../)
      return 60 - classification.depth;
    case 'current-directory':
      // Bare './' = 6, depth 0 (./file) = 60, depth 1+ = 60 + depth
      if (classification.isBareSlash) return 6;
      return 60 + classification.depth;
    default:
      throw new UnknownImportGroupKindError();
  }
}
