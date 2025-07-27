/** Determines the import group priority based on the import source */
export function getImportGroupPriority(source: string): number {
  // Runtime-namespaced imports (node:, bun:, deno:, cloudflare:, etc.)
  if (/^(node|bun|deno|cloudflare|workerd|wrangler):/iu.test(source)) return 0;

  // Registry-namespaced imports (npm:, jsr:, etc.)
  if (/^(npm|jsr|esm|unpkg|cdn):/iu.test(source)) return 1;

  // Generic namespaced imports (anything with namespace:)
  if (/^[a-zA-Z][a-zA-Z0-9_-]*:/iu.test(source)) return 2;

  // Custom-aliased imports with $ prefixes ($lib/*, $app/*, etc.)
  // Note: @namespace/package is treated as a bare import, not an aliased import
  if (/^\$[a-zA-Z0-9_-]*\//u.test(source)) return 4;

  // Custom-aliased imports with ~ prefixes (~shared/*, ~lib/*, etc.) - same as $ prefixes
  // But NOT ~/config (which should be priority 5)
  if (/^~(?!\/)[a-zA-Z0-9_-]+\//u.test(source)) return 4;

  // Custom-aliased imports with @/ and ~/ prefixes (@/utils, ~/config, etc.)
  // These are treated as a separate tier closer to relative imports
  if (/^(?:@\/|~\/)/u.test(source)) return 5;

  // Parent-relative imports (../, ../../, etc.) - calculate depth
  const parentMatches = source.match(/^(\.\.\/)+/u);
  if (parentMatches) {
    const depth = parentMatches[0].split('../').length - 1;
    return 60 - depth; // Deeper parents have lower priority (come first)
  }

  // Single .. import
  if (source === '..') return 59;

  // Bare ./ import (edge case)
  if (source === './') return 6;

  // Current directory relative imports (./*)
  if (source.startsWith('./')) {
    // Count the depth of descendant imports
    const pathParts = source.split('/');
    const depth = pathParts.length - 2; // Subtract 2 for './' prefix and filename

    if (depth === 0)
      // Same directory import (./filename)
      return 60;

    // Descendant import (./folder/filename, ./folder/subfolder/filename, etc.)
    return 60 + depth;
  }

  // Non-namespaced bare imports (react, express, @types/*, etc.)
  return 3;
}
