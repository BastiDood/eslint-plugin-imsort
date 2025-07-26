import type { ImportIdentifier, ImportNode } from '../types.ts';

import type { FormattingPreferences } from './types.ts';

/** Formats an identifier for import statement generation */
function formatIdentifier(identifier: ImportIdentifier): string {
  const typePrefix = identifier.isTypeOnly === true ? 'type ' : '';

  if (typeof identifier.local !== 'undefined')
    return `${typePrefix}${identifier.imported} as ${identifier.local}`;

  return `${typePrefix}${identifier.imported}`;
}

/** Generates the corrected import statement with improved formatting */
export function generateImportStatement(
  importInfo: ImportNode,
  preferences: FormattingPreferences,
) {
  const { source, type, identifiers, isTypeOnly } = importInfo;

  // For full type-only imports, use the type prefix at statement level
  // For mixed imports, individual identifiers will have their own type prefixes
  const hasIndividualTypes = identifiers.some(id => id.isTypeOnly === true);
  const statementTypePrefix = isTypeOnly && !hasIndividualTypes ? 'type ' : '';
  const quote = preferences.useSingleQuotes ? "'" : '"';

  switch (type) {
    case 'side-effect':
      return `import ${statementTypePrefix}${quote}${source}${quote};`;

    case 'namespace': {
      const [identifier] = identifiers;
      if (typeof identifier === 'undefined')
        throw new Error('Namespace identifier is required');

      const formattedIdentifier = hasIndividualTypes
        ? formatIdentifier(identifier)
        : identifier.imported;
      return `import ${statementTypePrefix}* as ${formattedIdentifier} from ${quote}${source}${quote};`;
    }

    case 'default': {
      if (identifiers.length === 1) {
        const [identifier] = identifiers;
        if (typeof identifier === 'undefined')
          throw new Error('Default identifier is required');

        const formattedIdentifier = hasIndividualTypes
          ? formatIdentifier(identifier)
          : identifier.imported;
        return `import ${statementTypePrefix}${formattedIdentifier} from ${quote}${source}${quote};`;
      }
      // Default + named imports
      const [defaultId, ...namedIds] = identifiers;
      if (typeof defaultId === 'undefined')
        throw new Error('Default identifier is required');

      const sortedNamed = [...namedIds].sort((a, b) =>
        a.imported.localeCompare(b.imported, void 0, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

      // Format as single line
      const defaultFormatted = hasIndividualTypes
        ? formatIdentifier(defaultId)
        : defaultId.imported;
      const namedImportsStr = sortedNamed.map(formatIdentifier).join(', ');
      return `import ${statementTypePrefix}${defaultFormatted}, { ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;
    }

    case 'named': {
      const sortedIds = [...identifiers].sort((a, b) =>
        a.imported.localeCompare(b.imported, void 0, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

      // Format as single line
      const namedImportsStr = sortedIds.map(formatIdentifier).join(', ');
      return `import ${statementTypePrefix}{ ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;
    }

    default:
      return importInfo.text;
  }
}
