import type { ImportIdentifier, ImportNode } from '../types.ts';

import type { FormattingPreferences } from './types.ts';

/** Sorts identifiers with special case handling for same-letter different-case */
function sortIdentifiers(a: ImportIdentifier, b: ImportIdentifier): number {
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

  // Otherwise use case-sensitive sorting
  return a.imported.localeCompare(b.imported, void 0, {
    numeric: true,
    sensitivity: 'variant',
  });
}

/** Formats an identifier for import statement generation */
function formatIdentifier(
  identifier: ImportIdentifier,
  suppressTypePrefix = false,
): string {
  const typePrefix =
    !suppressTypePrefix && identifier.isTypeOnly === true ? 'type ' : '';
  return typeof identifier.local === 'undefined'
    ? `${typePrefix}${identifier.imported}`
    : `${typePrefix}${identifier.imported} as ${identifier.local}`;
}

/** Generates the corrected import statement with improved formatting */
export function generateImportStatement(
  importInfo: ImportNode,
  preferences: FormattingPreferences,
) {
  const { source, type, identifiers, isTypeOnly } = importInfo;

  // For statement-level type imports, use the type prefix at statement level
  // and suppress individual type prefixes
  const statementTypePrefix = isTypeOnly ? 'type ' : '';
  const suppressIndividualTypes = isTypeOnly; // If statement is type-only, don't add individual type prefixes
  const quote = preferences.useSingleQuotes ? "'" : '"';

  switch (type) {
    case 'side-effect':
      return `import ${statementTypePrefix}${quote}${source}${quote};`;

    case 'namespace': {
      const [identifier] = identifiers;
      if (typeof identifier === 'undefined')
        throw new Error('Namespace identifier is required');

      // For namespace imports, type keyword should always be at statement level
      return `import ${statementTypePrefix}* as ${identifier.imported} from ${quote}${source}${quote};`;
    }

    case 'default': {
      if (identifiers.length === 1) {
        const [identifier] = identifiers;
        if (typeof identifier === 'undefined')
          throw new Error('Default identifier is required');

        const formattedIdentifier = formatIdentifier(
          identifier,
          suppressIndividualTypes,
        );
        return `import ${statementTypePrefix}${formattedIdentifier} from ${quote}${source}${quote};`;
      }
      // Default + named imports
      const [defaultId, ...namedIds] = identifiers;
      if (typeof defaultId === 'undefined')
        throw new Error('Default identifier is required');

      const sortedNamed = [...namedIds].sort(sortIdentifiers);

      // Format as single line
      const defaultFormatted = formatIdentifier(
        defaultId,
        suppressIndividualTypes,
      );
      const namedImportsStr = sortedNamed
        .map(id => formatIdentifier(id, suppressIndividualTypes))
        .join(', ');
      return `import ${statementTypePrefix}${defaultFormatted}, { ${namedImportsStr} } from ${quote}${source}${quote};`;
    }

    case 'named': {
      const sortedIds = [...identifiers].sort(sortIdentifiers);

      // Format as single line for consistency
      const namedImportsStr = sortedIds
        .map(id => formatIdentifier(id, suppressIndividualTypes))
        .join(', ');
      return `import ${statementTypePrefix}{ ${namedImportsStr} } from ${quote}${source}${quote};`;
    }

    default:
      return importInfo.text;
  }
}
