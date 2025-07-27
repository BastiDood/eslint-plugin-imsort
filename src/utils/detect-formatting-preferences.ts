import type { FormattingPreferences } from './types.ts';

export function detectFormattingPreferences(
  sourceText: string,
  importText?: string,
): FormattingPreferences {
  // For the specific import text, preserve its original quote style
  if (typeof importText !== 'undefined') {
    // Check for single quotes in the import source
    const singleQuoteMatch = importText.match(/from\s*'[^']*'/u);
    const doubleQuoteMatch = importText.match(/from\s*"[^"]*"/u);

    // Also check for side-effect imports
    const sideEffectSingleQuote = importText.match(/import\s*'[^']*'/u);
    const sideEffectDoubleQuote = importText.match(/import\s*"[^"]*"/u);

    if (
      (singleQuoteMatch || sideEffectSingleQuote) &&
      !(doubleQuoteMatch || sideEffectDoubleQuote)
    )
      return { useSingleQuotes: true, useTrailingComma: false };

    if (
      (doubleQuoteMatch || sideEffectDoubleQuote) &&
      !(singleQuoteMatch || sideEffectSingleQuote)
    )
      return { useSingleQuotes: false, useTrailingComma: false };
  }

  // Default to single quotes for consistency
  return { useSingleQuotes: true, useTrailingComma: false };
}
