export type ImportType = 'namespace' | 'default' | 'named' | 'side-effect';

export interface ImportIdentifier {
  /** The name being imported */
  imported: string;
  /** The local name (alias), if different from imported */
  local?: string | undefined;
  /** Whether this specific identifier is type-only (for mixed imports) */
  isTypeOnly?: boolean;
}

export interface ImportNode {
  /** The import source */
  source: string;
  /** The full import statement text */
  text: string;
  /** Line number */
  line: number;
  /** Import type: 'namespace', 'default', 'named', 'side-effect' */
  type: ImportType;
  /** Import identifiers with alias information */
  identifiers: ImportIdentifier[];
  /** Whether this is a type-only import */
  isTypeOnly: boolean;
}

export type ImportTypeOrder = Record<ImportType, number>;

/** Import group kinds for classification */
export type ImportGroupKind =
  | 'runtime-namespaced'
  | 'registry-namespaced'
  | 'generic-namespaced'
  | 'bare-import'
  | 'dollar-aliased'
  | 'tilde-aliased'
  | 'at-aliased'
  | 'parent-relative'
  | 'current-directory';

/** Classification for runtime-namespaced imports (node:, bun:, deno:, etc.) */
export interface RuntimeNamespacedGroup {
  kind: 'runtime-namespaced';
  namespace: string;
}

/** Classification for registry-namespaced imports (npm:, jsr:, etc.) */
export interface RegistryNamespacedGroup {
  kind: 'registry-namespaced';
  namespace: string;
}

/** Classification for generic namespaced imports (custom:, etc.) */
export interface GenericNamespacedGroup {
  kind: 'generic-namespaced';
  namespace: string;
}

/** Classification for bare imports (react, @angular/core, etc.) */
export interface BareImportGroup {
  kind: 'bare-import';
  isScoped: boolean;
}

/** Classification for $ aliased imports ($lib/*, $app/*, etc.) */
export interface DollarAliasedGroup {
  kind: 'dollar-aliased';
  alias: string;
}

/** Classification for ~ aliased imports (~/config, ~shared/*, etc.) */
export interface TildeAliasedGroup {
  kind: 'tilde-aliased';
  isRoot: boolean;
}

/** Classification for @/ aliased imports (@/utils, etc.) */
export interface AtAliasedGroup {
  kind: 'at-aliased';
}

/** Classification for parent-relative imports (../, ../../, etc.) */
export interface ParentRelativeGroup {
  kind: 'parent-relative';
  depth: number;
}

/** Classification for current directory imports (./, ./folder/, etc.) */
export interface CurrentDirectoryGroup {
  kind: 'current-directory';
  depth: number;
  /** True if the source is exactly './' (bare slash edge case) */
  isBareSlash: boolean;
}

/** Discriminated union for all import group classifications */
export type ImportGroupClassification =
  | RuntimeNamespacedGroup
  | RegistryNamespacedGroup
  | GenericNamespacedGroup
  | BareImportGroup
  | DollarAliasedGroup
  | TildeAliasedGroup
  | AtAliasedGroup
  | ParentRelativeGroup
  | CurrentDirectoryGroup;
