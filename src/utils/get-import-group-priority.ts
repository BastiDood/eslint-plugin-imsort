/** Determines the import group priority based on the import source */
export function getImportGroupPriority(source: string): number {
  // Runtime-namespaced imports (node:, bun:, deno:, cloudflare:, etc.)
  if (/^(node|bun|deno|cloudflare|workerd|wrangler):/iu.test(source)) return 0;

  // Registry-namespaced imports (npm:, jsr:, etc.)
  if (/^(npm|jsr|esm|unpkg|cdn):/iu.test(source)) return 1;

  // Generic namespaced imports (anything with namespace:)
  if (/^[a-zA-Z][a-zA-Z0-9_-]*:/iu.test(source)) return 2;

  // Custom-aliased imports (@/*, ~/*, ~shared/*, etc.)
  if (/^(@\/|~[a-zA-Z0-9_-]*\/)/iu.test(source)) return 4;

  // Relative imports starting with ./
  if (source.startsWith('./')) return 6;

  // Parent-relative imports (../, ../../, etc.) - calculate depth
  const parentMatches = source.match(/^(\.\.\/)+/u);
  if (parentMatches) {
    const depth = parentMatches[0].split('../').length - 1;
    return 5000 - depth; // Higher depth = higher priority within parent-relative group
  }

  // Single .. import
  if (source === '..') return 5001;

  // Non-namespaced bare imports (react, express, @types/*, etc.)
  return 3;
}
