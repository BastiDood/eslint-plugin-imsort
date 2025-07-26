import type { FormattingPreferences } from './types.ts';

import type { ImportNode } from '../types.ts';

/** Generates the corrected import statement with improved formatting */
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
      const [identifier] = identifiers;
      if (typeof identifier === 'undefined')
        throw new Error('Namespace identifier is required');

      return `import ${typePrefix}* as ${identifier} from ${quote}${source}${quote};`;
    }

    case 'default': {
      if (identifiers.length === 1) {
        const [identifier] = identifiers;
        if (typeof identifier === 'undefined')
          throw new Error('Default identifier is required');

        return `import ${typePrefix}${identifier} from ${quote}${source}${quote};`;
      }
      // Default + named imports
      const [defaultId, ...namedIds] = identifiers;
      if (typeof defaultId === 'undefined')
        throw new Error('Default identifier is required');

      const sortedNamed = [...namedIds].sort((a, b) =>
        a.localeCompare(b, void 0, { numeric: true, sensitivity: 'base' }),
      );

      // Format based on length and preferences
      const namedImportsStr = sortedNamed.join(', ');
      const singleLineImport = `import ${typePrefix}${defaultId}, { ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;

      if (singleLineImport.length <= preferences.maxLineLength)
        return singleLineImport;

      // Multi-line format for long imports
      const formattedNamed = sortedNamed.map(name => `  ${name}`).join(',\n');
      return `import ${typePrefix}${defaultId}, {\n${formattedNamed}${preferences.useTrailingComma ? ',' : ''}\n} from ${quote}${source}${quote};`;
    }

    case 'named': {
      const sortedIds = [...identifiers].sort((a, b) =>
        a.localeCompare(b, void 0, { numeric: true, sensitivity: 'base' }),
      );

      // Format based on length and preferences
      const namedImportsStr = sortedIds.join(', ');
      const singleLineImport = `import ${typePrefix}{ ${namedImportsStr}${preferences.useTrailingComma ? ',' : ''} } from ${quote}${source}${quote};`;

      if (
        singleLineImport.length <= preferences.maxLineLength ||
        sortedIds.length <= 3
      )
        return singleLineImport;

      // Multi-line format for long imports
      const formattedIds = sortedIds.map(name => `  ${name}`).join(',\n');
      return `import ${typePrefix}{\n${formattedIds}${preferences.useTrailingComma ? ',' : ''}\n} from ${quote}${source}${quote};`;
    }

    default:
      return importInfo.text;
  }
}
