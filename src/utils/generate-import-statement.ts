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

      // Format based on length and preferences
      const defaultFormatted = hasIndividualTypes
        ? formatIdentifier(defaultId)
        : defaultId.imported;
      const namedImportsStr = sortedNamed.map(formatIdentifier).join(', ');
      const singleLineImport = `import ${statementTypePrefix}${defaultFormatted}, { ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;

      if (singleLineImport.length <= preferences.maxLineLength)
        return singleLineImport;

      // Multi-line format for long imports
      const formattedNamed = sortedNamed
        .map(id => `  ${formatIdentifier(id)}`)
        .join(',\n');
      return `import ${statementTypePrefix}${defaultFormatted}, {\n${formattedNamed}${preferences.useTrailingComma ? ',' : ''}\n} from ${quote}${source}${quote};`;
    }

    case 'named': {
      const sortedIds = [...identifiers].sort((a, b) =>
        a.imported.localeCompare(b.imported, void 0, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

      // Format based on length and preferences
      const namedImportsStr = sortedIds.map(formatIdentifier).join(', ');
      const singleLineImport = `import ${statementTypePrefix}{ ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;

      if (
        singleLineImport.length <= preferences.maxLineLength ||
        sortedIds.length <= 3
      )
        return singleLineImport;

      // Multi-line format for long imports
      const formattedIds = sortedIds
        .map(id => `  ${formatIdentifier(id)}`)
        .join(',\n');
      return `import ${statementTypePrefix}{\n${formattedIds}${preferences.useTrailingComma ? ',' : ''}\n} from ${quote}${source}${quote};`;
    }

    default:
      return importInfo.text;
  }
}
