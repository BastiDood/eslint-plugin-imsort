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
