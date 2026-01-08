import type { ImportIdentifier, ImportNode } from '#types.ts';

import type { FormattingPreferences } from './types.ts';
import { sortIdentifiers } from './sort.ts';

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

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let importStatement: string;
  switch (type) {
    case 'side-effect':
      importStatement = `import ${statementTypePrefix}${quote}${source}${quote};`;
      break;
    case 'namespace': {
      const [identifier] = identifiers;
      if (typeof identifier === 'undefined')
        throw new Error('Namespace identifier is required');

      // For namespace imports, type keyword should always be at statement level
      importStatement = `import ${statementTypePrefix}* as ${identifier.imported} from ${quote}${source}${quote};`;
      break;
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
        importStatement = `import ${statementTypePrefix}${formattedIdentifier} from ${quote}${source}${quote};`;
      } else {
        // Default + named imports
        const [defaultId, ...namedIds] = identifiers;
        if (typeof defaultId === 'undefined')
          throw new Error('Default identifier is required');

        // Sort named imports using centralized sorting logic
        const sortedNamedIds = sortIdentifiers(namedIds);

        // Format as single line
        const defaultFormatted = formatIdentifier(
          defaultId,
          suppressIndividualTypes,
        );
        const namedImportsStr = sortedNamedIds
          .map(id => formatIdentifier(id, suppressIndividualTypes))
          .join(', ');
        importStatement = `import ${statementTypePrefix}${defaultFormatted}, { ${namedImportsStr} } from ${quote}${source}${quote};`;
      }
      break;
    }
    case 'named': {
      // Sort identifiers using centralized sorting logic
      const sortedIdentifiers = sortIdentifiers(identifiers);

      // Format as single line
      const namedImportsStr = sortedIdentifiers
        .map(id => formatIdentifier(id, suppressIndividualTypes))
        .join(', ');
      importStatement = `import ${statementTypePrefix}{ ${namedImportsStr} } from ${quote}${source}${quote};`;
      break;
    }
    default:
      return importInfo.text;
  }

  // Return the import statement without indentation
  return importStatement;
}
