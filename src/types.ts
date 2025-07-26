export type ImportType = 'namespace' | 'default' | 'named' | 'side-effect';

export interface ImportNode {
  /** The import source */
  source: string;
  /** The full import statement text */
  text: string;
  /** Line number */
  line: number;
  /** Import type: 'namespace', 'default', 'named', 'side-effect' */
  type: ImportType;
  /** Import identifiers */
  identifiers: string[];
  /** Whether this is a type-only import */
  isTypeOnly: boolean;
}

export type ImportTypeOrder = Record<ImportType, number>;
