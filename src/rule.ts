import { enumerate } from 'itertools';
import type { ImportDeclaration, Program, SourceLocation } from 'estree';
import type { Rule } from 'eslint';

import type { ImportNode } from './types.ts';

import { areIdentifiersSorted as areIdentifiersSortedArray } from './utils/sort.ts';
import { detectFormattingPreferences } from './utils/detect-formatting-preferences.ts';
import { extractImportInfo } from './utils/extract-import-info.ts';
import { generateImportStatement } from './utils/generate-import-statement.ts';
import { getImportGroupPriority } from './utils/get-import-group-priority.ts';
import { sortImportsInGroup } from './utils/sort-imports-in-group.ts';

// Svelte-specific AST node types
interface SvelteScriptElement {
  type: 'SvelteScriptElement';
  body: ImportDeclaration[];
  range?: [number, number];
}

interface SvelteProgram {
  type: 'SvelteProgram';
  body: SvelteScriptElement[];
  range?: [number, number];
  loc?: SourceLocation | null;
}

type ProgramNode = Program | SvelteProgram;

type ProgramBodyItem = Program['body'][number];
type ProgramBodyWithSvelte = (ProgramBodyItem | SvelteScriptElement)[];

interface ImportDeclarationWithRange extends ImportDeclaration {
  range: [number, number];
}

function assertHasRange(
  node: ImportDeclaration,
): asserts node is ImportDeclarationWithRange {
  if (typeof node.range === 'undefined')
    throw new Error('AST nodes must have range information');
}

/** Check if identifiers within an import are sorted */
function areIdentifiersSorted(importInfo: ImportNode): boolean {
  switch (importInfo.type) {
    case 'side-effect':
    case 'namespace':
      return true; // These don't have sortable identifiers
    case 'default': {
      if (importInfo.identifiers.length <= 1) return true; // Just default import
      // For default + named imports, check if named imports (after first) are sorted
      const namedIdentifiers = importInfo.identifiers.slice(1);
      return areIdentifiersSortedArray(namedIdentifiers);
    }
    case 'named':
      return areIdentifiersSortedArray(importInfo.identifiers);
    default:
      return true;
  }
}

/** Generate group key for an import */
function getGroupKey(importInfo: ImportNode) {
  const basePriority = getImportGroupPriority(importInfo.source);
  // Type-only imports should be treated as regular imports for grouping purposes
  // but preserved in their original position during sorting
  return basePriority;
}

/** Check if there are sufficient blank lines between two import nodes */
function hasBlankLineBetween(
  prevNode: ImportDeclaration,
  currentNode: ImportDeclaration,
  text: string,
): boolean {
  assertHasRange(prevNode);
  assertHasRange(currentNode);

  const textBetween = text.slice(prevNode.range[1], currentNode.range[0]);
  const newlineCount = (textBetween.match(/\n/gu) || []).length;
  return newlineCount >= 2;
}

/** Extract import declarations from a node, handling Svelte script blocks */
function extractImportDeclarations(node: ProgramNode): ImportDeclaration[] {
  const imports: ImportDeclaration[] = [];

  switch (node.type) {
    case 'Program': {
      // For Svelte files, the body may contain SvelteScriptElement nodes
      const body = node.body as unknown as ProgramBodyWithSvelte;
      for (const statement of body)
        switch (statement.type) {
          case 'ImportDeclaration':
            imports.push(statement);
            break;
          case 'SvelteScriptElement': {
            // Svelte script blocks have their imports directly in the body array
            // We need to sort them by their position in the source to preserve order
            const scriptImports = statement.body
              .filter(
                (scriptItem): scriptItem is ImportDeclaration =>
                  scriptItem.type === 'ImportDeclaration',
              )
              .sort((a: ImportDeclaration, b: ImportDeclaration) => {
                assertHasRange(a);
                assertHasRange(b);
                return a.range[0] - b.range[0];
              });
            imports.push(...scriptImports);
            break;
          }
          default:
            break;
        }
      break;
    }
    case 'SvelteProgram': {
      // For Svelte files, the body contains SvelteScriptElement nodes
      for (const statement of node.body)
        switch (statement.type) {
          case 'SvelteScriptElement': {
            // Svelte script blocks have their imports directly in the body array
            // We need to sort them by their position in the source to preserve order
            const scriptImports = statement.body
              .filter(
                (scriptItem): scriptItem is ImportDeclaration =>
                  scriptItem.type === 'ImportDeclaration',
              )
              .sort((a: ImportDeclaration, b: ImportDeclaration) => {
                assertHasRange(a);
                assertHasRange(b);
                return a.range[0] - b.range[0];
              });
            imports.push(...scriptImports);
            break;
          }
          default:
            break;
        }
      break;
    }
    default:
      break;
  }

  return imports;
}

/** Extract indentation from the source text around an import (preserve exactly) */
function extractIndentation(
  sourceText: string,
  importRange: [number, number],
): string {
  const lineStart = sourceText.lastIndexOf('\n', importRange[0]) + 1;
  const lineEnd = sourceText.indexOf('\n', importRange[0]);
  const lineEndPos = lineEnd === -1 ? sourceText.length : lineEnd;
  const fullLine = sourceText.slice(lineStart, lineEndPos);
  const match = fullLine.match(/^(\s*)/u);
  return typeof match !== 'undefined' &&
    match !== null &&
    typeof match[1] !== 'undefined'
    ? match[1]
    : '';
}

export const sortImports: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Sort and group imports according to specified rules',
      category: 'Stylistic Issues',
      recommended: true,
    },
    fixable: 'code',
    schema: [],
  },
  create(context: Rule.RuleContext) {
    const text = context.sourceCode.getText();
    return {
      Program(node: Program) {
        // Extract import declarations, handling both standard and Svelte files
        const importDeclarations = extractImportDeclarations(
          node as ProgramNode,
        );

        // Collect import declarations and their parsed info in a single pass
        const importData: {
          node: ImportDeclaration;
          info: ImportNode;
          indentation: string;
        }[] = [];

        for (const statement of importDeclarations) {
          const importInfo = extractImportInfo(statement, text);
          assertHasRange(statement);
          const indentation = extractIndentation(text, statement.range);
          importData.push({ node: statement, info: importInfo, indentation });
        }

        if (importData.length === 0) return; // No imports to sort

        const imports = importData.map(({ info }) => info);
        const importNodes = importData.map(({ node }) => node);

        // Group imports by priority AND type-only
        const groups = new Map<number, ImportNode[]>();

        for (const importInfo of imports) {
          const groupKey = getGroupKey(importInfo);
          const existingGroup = groups.get(groupKey);
          if (typeof existingGroup === 'undefined')
            groups.set(groupKey, [importInfo]);
          else existingGroup.push(importInfo);
        }

        // Sort groups by priority, then sort within each group
        const sortedGroups = Array.from(groups.entries())
          .sort(([a], [b]) => a - b)
          .map(([_, groupImports]) => sortImportsInGroup(groupImports));

        // Generate the expected import order
        const expectedImports = sortedGroups.flat();

        // Check if the current imports match the expected order
        let needsReordering = false;

        // First, check if the number of imports matches
        if (imports.length === expectedImports.length)
          // Compare each import with its expected counterpart
          for (const [i, importInfo] of enumerate(imports)) {
            if (typeof importInfo === 'undefined') continue;

            // Check if identifiers are sorted within this import
            if (!areIdentifiersSorted(importInfo)) {
              needsReordering = true;
              break;
            }

            // Check blank lines between groups (skip first import)
            if (i > 0) {
              const prevNode = importNodes[i - 1];
              const currentNode = importNodes[i];
              const prevImportInfo = imports[i - 1];

              if (
                typeof prevNode !== 'undefined' &&
                typeof currentNode !== 'undefined' &&
                typeof prevImportInfo !== 'undefined'
              ) {
                const currentGroupKey = getGroupKey(importInfo);
                const prevGroupKey = getGroupKey(prevImportInfo);

                if (
                  currentGroupKey !== prevGroupKey &&
                  !hasBlankLineBetween(prevNode, currentNode, text)
                ) {
                  needsReordering = true;
                  break;
                }
              }
            }

            // Compare with expected import at the same position
            const expectedImport = expectedImports[i];
            if (typeof expectedImport !== 'undefined') {
              // Compare the entire import structure
              if (
                importInfo.source !== expectedImport.source ||
                importInfo.type !== expectedImport.type ||
                importInfo.identifiers.length !==
                  expectedImport.identifiers.length
              ) {
                needsReordering = true;
                break;
              }

              // Compare each identifier to ensure they match exactly
              for (const [j, currentId] of enumerate(importInfo.identifiers)) {
                const expectedId = expectedImport.identifiers[j];
                if (
                  typeof expectedId === 'undefined' ||
                  currentId.imported !== expectedId.imported ||
                  (currentId.isTypeOnly ?? false) !==
                    (expectedId.isTypeOnly ?? false)
                ) {
                  needsReordering = true;
                  break;
                }
              }
              if (needsReordering) break;
            }
          }
        else needsReordering = true;

        if (needsReordering) {
          const [firstImport] = importNodes;
          const lastImport = importNodes[importNodes.length - 1];

          if (
            typeof firstImport === 'undefined' ||
            typeof lastImport === 'undefined' ||
            typeof firstImport.range === 'undefined' ||
            typeof lastImport.range === 'undefined'
          )
            return;

          context.report({
            node: firstImport,
            message:
              'Imports should be sorted and grouped according to the specified rules',
            fix(fixer) {
              // Build maps to preserve original indentation per import
              const indentationByKey = new Map<string, string>();
              for (const { info, indentation } of importData) {
                const key = `${info.source}:${info.type}:${info.identifiers
                  .map(
                    id =>
                      `${id.imported}${typeof id.local === 'undefined' ? '' : `:${id.local}`}${id.isTypeOnly === true ? ':type' : ''}`,
                  )
                  .join(',')}`;
                indentationByKey.set(key, indentation);
              }

              // Generate sorted import statements preserving indentation, quote style, and brace spacing
              const sortedStatements: string[] = [];

              for (const [groupIndex, groupImports] of enumerate(
                sortedGroups,
              )) {
                if (groupIndex > 0) sortedStatements.push('');

                for (const importInfo of groupImports) {
                  const key = `${importInfo.source}:${importInfo.type}:${importInfo.identifiers
                    .map(
                      id =>
                        `${id.imported}${typeof id.local === 'undefined' ? '' : `:${id.local}`}${id.isTypeOnly === true ? ':type' : ''}`,
                    )
                    .join(',')}`;
                  const indentation = indentationByKey.get(key) ?? '';
                  const preferences = detectFormattingPreferences(
                    text,
                    importInfo.text,
                  );
                  const importStatement = generateImportStatement(
                    importInfo,
                    preferences,
                  );
                  sortedStatements.push(indentation + importStatement);
                }
              }

              const replacement = sortedStatements.join('\n');

              if (
                typeof firstImport.range === 'undefined' ||
                typeof lastImport.range === 'undefined'
              )
                return null;

              // Find the start of the first import line to avoid including original indentation
              const firstImportLineStart =
                text.lastIndexOf('\n', firstImport.range[0]) + 1;
              const lastImportLineEnd = text.indexOf('\n', lastImport.range[1]);
              const lastImportEnd =
                lastImportLineEnd === -1 ? text.length : lastImportLineEnd;

              return fixer.replaceTextRange(
                [firstImportLineStart, lastImportEnd],
                replacement,
              );
            },
          });
        }
      },
    };
  },
};
