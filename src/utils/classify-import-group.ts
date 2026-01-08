const RUNTIME_NAMESPACES = new Set([
  'node',
  'bun',
  'deno',
  'cloudflare',
  'workerd',
  'wrangler',
]);
const REGISTRY_NAMESPACES = new Set(['npm', 'jsr', 'esm', 'unpkg', 'cdn']);

/** Classifies an import source into its group kind */
export function classifyImportGroup(source: string) {
  // Check namespaced imports (anything with colon)
  const colonIndex = source.indexOf(':');
  if (colonIndex > 0) {
    const namespace = source.slice(0, colonIndex).toLowerCase();
    const beforeColon = source.slice(0, colonIndex);

    if (RUNTIME_NAMESPACES.has(namespace))
      return { kind: 'runtime-namespaced' as const, namespace };

    if (REGISTRY_NAMESPACES.has(namespace))
      return { kind: 'registry-namespaced' as const, namespace };

    // Generic namespace must match [a-zA-Z][a-zA-Z0-9_-]* pattern
    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/u.test(beforeColon))
      return { kind: 'generic-namespaced' as const, namespace };
  }

  // $ aliased imports ($lib/*, $app/*, etc.)
  const dollarMatch = source.match(/^\$([a-zA-Z0-9_-]*)\//u);
  if (dollarMatch !== null) {
    const [, alias] = dollarMatch;
    return {
      kind: 'dollar-aliased' as const,
      alias: `$${typeof alias === 'undefined' ? '' : alias}`,
    };
  }

  // @/ aliased imports (@/utils, etc.)
  if (source.startsWith('@/')) return { kind: 'at-aliased' as const };

  // ~/ aliased imports (root tilde)
  if (source.startsWith('~/'))
    return { kind: 'tilde-aliased' as const, isRoot: true };

  // ~name/ aliased imports (non-root tilde like ~shared/)
  const tildeMatch = source.match(/^~(?!\/)[a-zA-Z0-9_-]+\//u);
  if (tildeMatch !== null)
    return { kind: 'tilde-aliased' as const, isRoot: false };

  // Parent relative imports (../, ../../, etc.)
  const parentMatch = source.match(/^(\.\.\/)+/u);
  if (parentMatch !== null) {
    const [matchStr] = parentMatch;
    const depth = matchStr.split('../').length - 1;
    return { kind: 'parent-relative' as const, depth };
  }

  // Single .. import (edge case)
  if (source === '..') return { kind: 'parent-relative' as const, depth: 1 };

  // Current directory imports (./, ./folder/, etc.)
  if (source.startsWith('./') || source === './') {
    const isBareSlash = source === './';
    const pathParts = source.split('/');
    // Subtract 2 for './' prefix and filename
    const depth = Math.max(0, pathParts.length - 2);
    return { kind: 'current-directory' as const, depth, isBareSlash };
  }

  // Bare imports (react, @angular/core, etc.) - fallback
  return { kind: 'bare-import' as const, isScoped: source.startsWith('@') };
}
