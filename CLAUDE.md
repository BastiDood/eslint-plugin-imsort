# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm test           # Run tests in watch mode (vitest)
pnpm test:run       # Run tests once and exit
pnpm lint           # Run ESLint
pnpm lint:fix       # Run ESLint with auto-fix
pnpm fmt            # Check Prettier formatting
pnpm fmt:fix        # Fix Prettier formatting
pnpm check          # TypeScript type checking (no emit)
pnpm build          # Build with tsup (outputs to dist/)
```

## Architecture

This is an ESLint plugin that sorts and groups imports automatically. It exposes a single rule (`@bastidood/imsort/sort-imports`) via the plugin entry point at `src/index.ts`.

### Core Flow

1. **Collection**: `src/rule.ts` collects all `ImportDeclaration` nodes during AST traversal
2. **Classification**: Each import is classified into one of 9 groups via `src/utils/classify-import-group.ts`
3. **Sorting**: Imports are sorted within groups by `src/utils/sort-imports-in-group.ts`
4. **Fix Generation**: The rule generates fixes that reconstruct imports in the correct order

### Import Group Classification

Groups are ordered by `src/utils/compare.ts:GROUP_ORDER`:

1. Runtime-namespaced (`node:`, `bun:`, `deno:`, `cloudflare:`, `workerd:`, `wrangler:`)
2. Registry-namespaced (`npm:`, `jsr:`, `esm:`, `unpkg:`, `cdn:`)
3. Generic-namespaced (custom `namespace:` patterns)
4. Bare imports (third-party packages)
5. Dollar-aliased (`$lib/*`, `$app/*`)
6. Tilde-aliased (`~shared/*`, `~/`)
7. At-aliased (`@/`)
8. Parent-relative (`../`) - sorted by descending depth
9. Current-directory (`./`) - sorted by ascending depth

### Type System

`src/types.ts` defines discriminated unions for type-safe import handling:

- `ImportType`: `'namespace' | 'default' | 'named' | 'side-effect'`
- `ImportGroupClassification`: Union of 9 group interfaces, each with a `kind` discriminant

### Key Utilities

| Module                             | Purpose                                       |
| ---------------------------------- | --------------------------------------------- |
| `classify-import-group.ts`         | Categorizes import sources into groups        |
| `extract-import-info.ts`           | Parses import AST nodes to `ImportNode`       |
| `generate-import-statement.ts`     | Reconstructs import strings from `ImportNode` |
| `compare.ts`                       | Comparison functions and group ordering       |
| `sort-imports-in-group.ts`         | Sorts imports within a single group           |
| `sort.ts`                          | Sorts identifiers within an import            |
| `detect-formatting-preferences.ts` | Detects quote style and trailing commas       |

### Subpath Imports

The project uses `#*` subpath imports mapped to `./src/*`. When importing internal modules, use `#types.ts` instead of `./types.ts` or relative paths.

## Testing

Tests use `vitest` with `eslint-vitest-rule-tester` for ESLint rule testing. Test files are colocated with source files using `.test.ts` suffix.
