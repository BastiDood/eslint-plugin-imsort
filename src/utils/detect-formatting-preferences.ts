import type { FormattingPreferences } from './types.ts';

export function detectFormattingPreferences(
  sourceText: string,
): FormattingPreferences {
  // Detect quote preference by counting occurrences in import statements
  let singleQuoteCount = 0;
  let doubleQuoteCount = 0;

  // Find all import statements, including multiline ones
  let searchIndex = 0;

  while (searchIndex < sourceText.length) {
    const remaining = sourceText.slice(searchIndex);

    // Try to match regular imports with 'from' keyword (including multiline)
    const importWithFromMatch = remaining.match(
      /import[\s\S]*?from\s*(['"])[^'"]*\1/i,
    );

    // Try to match side-effect imports (import 'module')
    const sideEffectMatch = remaining.match(/import\s*(['"])[^'"]*\1/i);

    let match;
    const fromIndex = importWithFromMatch?.index ?? Infinity;
    const sideEffectIndex = sideEffectMatch?.index ?? Infinity;

    if (importWithFromMatch && fromIndex <= sideEffectIndex) {
      match = importWithFromMatch;
    } else if (sideEffectMatch) {
      match = sideEffectMatch;
    } else {
      break;
    }

    // Extract the quote character used for the import source
    const quoteMatch = match[0].match(/(['"])[^'"]*\1$/);
    if (quoteMatch) {
      if (quoteMatch[1] === "'") {
        singleQuoteCount++;
      } else if (quoteMatch[1] === '"') {
        doubleQuoteCount++;
      }
    }

    searchIndex += (match.index || 0) + match[0].length;
  }

  // Detect trailing comma preference - look for commas before closing brace
  const hasTrailingComma = /import[^{]*\{[^}]*,\s*\}/isu.test(sourceText);

  return {
    useSingleQuotes: singleQuoteCount > doubleQuoteCount,
    useTrailingComma: hasTrailingComma,
    maxLineLength: 80, // Default, could be enhanced to detect from existing code
  };
}
