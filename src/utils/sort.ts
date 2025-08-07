import type { ImportIdentifier } from '../types.ts';

/**
 * Sort import identifiers with natural sorting and case-insensitive comparison.
 * This function handles:
 * - Natural sorting for numbers (e.g., item1, item2, item10, item20)
 * - Case-insensitive alphabetical sorting
 * - Consistent behavior across all import types
 */
export function sortIdentifiers(
  identifiers: ImportIdentifier[],
): ImportIdentifier[] {
  return [...identifiers].sort((a, b) => {
    // Sort all specifiers alphabetically, ignoring the type keyword for sorting purposes
    // Special case: if both identifiers start with the same letter but different cases, prioritize uppercase
    const [aFirst] = a.imported;
    const [bFirst] = b.imported;
    if (typeof aFirst !== 'undefined' && typeof bFirst !== 'undefined') {
      const aLower = aFirst.toLowerCase();
      const bLower = bFirst.toLowerCase();
      if (aLower === bLower && aFirst !== bFirst) {
        // Same letter, different case - prioritize uppercase
        const aIsUpper =
          aFirst === aFirst.toUpperCase() && aFirst !== aFirst.toLowerCase();
        const bIsUpper =
          bFirst === bFirst.toUpperCase() && bFirst !== bFirst.toLowerCase();

        if (aIsUpper && !bIsUpper) return -1;
        if (!aIsUpper && bIsUpper) return 1;
      }
    }

    // Otherwise use natural sorting with case-sensitive comparison
    return a.imported.localeCompare(b.imported, void 0, {
      numeric: true,
      sensitivity: 'case',
    });
  });
}

/**
 * Check if identifiers are already sorted according to the sorting rules.
 * This function uses the same sorting logic as `sortIdentifiers` to ensure consistency.
 */
export function areIdentifiersSorted(identifiers: ImportIdentifier[]): boolean {
  if (identifiers.length <= 1) return true;

  const sorted = sortIdentifiers(identifiers);
  return identifiers.every(
    (id, index) => id.imported === sorted[index]?.imported,
  );
}
