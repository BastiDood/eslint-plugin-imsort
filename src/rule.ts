import { enumerate } from 'itertools';
import type { ImportDeclaration, Program } from 'estree';
import type { Rule } from 'eslint';

import type { ImportNode } from './types.ts';

import { areIdentifiersSorted as areIdentifiersSortedArray } from './utils/sort.ts';
import { detectFormattingPreferences } from './utils/detect-formatting-preferences.ts';
import { extractImportInfo } from './utils/extract-import-info.ts';
import { generateImportStatement } from './utils/generate-import-statement.ts';
import { getImportGroupPriority } from './utils/get-import-group-priority.ts';
import { sortImportsInGroup } from './utils/sort-imports-in-group.ts';

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
    const importData: {
      node: ImportDeclaration;
      info: ImportNode;
      indentation: string;
    }[] = [];

    return {
      // Collect all ImportDeclaration nodes regardless of AST shape
      ImportDeclaration(node: ImportDeclaration) {
        const importInfo = extractImportInfo(node, text);
        assertHasRange(node);
        const indentation = extractIndentation(text, node.range);
        importData.push({ node, info: importInfo, indentation });
      },
      // After finishing traversal, process the collected imports
      'Program:exit'(_node: Program) {
        if (importData.length === 0) return; // No imports to sort

        // Helper to compute a block key (Svelte <script> block start) for a given position
        function getSvelteScriptBlockKey(position: number): number {
          const openStart = text.lastIndexOf('<script', position);
          if (openStart === -1) return -1; // Non-svelte or outside any script block
          const openEnd = text.indexOf('>', openStart);
          if (openEnd === -1 || openEnd > position) return -1;
          const closeIdx = text.indexOf('</script>', openEnd);
          if (closeIdx !== -1 && closeIdx < position) return -1; // Closed before position
          return openStart;
        }

        // Ensure processing in source order
        const orderedImportData = [...importData].sort((a, b) => {
          assertHasRange(a.node);
          assertHasRange(b.node);
          return a.node.range[0] - b.node.range[0];
        });

        // Group imports by their containing Svelte <script> block (or -1 for normal files)
        const importsByBlock = new Map<number, typeof importData>();
        for (const item of orderedImportData) {
          assertHasRange(item.node);
          const blockKey = getSvelteScriptBlockKey(item.node.range[0]);
          const arr = importsByBlock.get(blockKey);
          if (typeof arr === 'undefined') importsByBlock.set(blockKey, [item]);
          else arr.push(item);
        }

        function computeExpected(imports: ImportNode[]) {
          const groups = new Map<number, ImportNode[]>();
          for (const importInfo of imports) {
            const groupKey = getGroupKey(importInfo);
            const existingGroup = groups.get(groupKey);
            if (typeof existingGroup === 'undefined')
              groups.set(groupKey, [importInfo]);
            else existingGroup.push(importInfo);
          }
          const sortedGroups = Array.from(groups.entries())
            .sort(([a], [b]) => a - b)
            .map(([_, groupImports]) => sortImportsInGroup(groupImports));
          return {
            expectedImports: sortedGroups.flat(),
            sortedGroups,
          } as const;
        }

        let needsReordering = false;
        const blockFixData: {
          blockKey: number;
          firstImport: ImportDeclaration;
          lastImport: ImportDeclaration;
          sortedGroups: ImportNode[][];
          orderedItems: typeof importData;
        }[] = [];

        for (const [blockKey, items] of importsByBlock.entries()) {
          const imports = items.map(({ info }) => info);
          const importNodes = items.map(({ node }) => node);
          const { expectedImports, sortedGroups } = computeExpected(imports);

          let needsBlock = false;

          if (imports.length === expectedImports.length)
            for (const [i, importInfo] of enumerate(imports)) {
              if (typeof importInfo === 'undefined') continue;

              if (!areIdentifiersSorted(importInfo)) {
                needsBlock = true;
                break;
              }

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
                    needsBlock = true;
                    break;
                  }
                }
              }

              const expectedImport = expectedImports[i];
              if (typeof expectedImport !== 'undefined') {
                if (
                  importInfo.source !== expectedImport.source ||
                  importInfo.type !== expectedImport.type ||
                  importInfo.identifiers.length !==
                    expectedImport.identifiers.length
                ) {
                  needsBlock = true;
                  break;
                }

                for (const [j, currentId] of enumerate(
                  importInfo.identifiers,
                )) {
                  const expectedId = expectedImport.identifiers[j];
                  if (
                    typeof expectedId === 'undefined' ||
                    currentId.imported !== expectedId.imported ||
                    (currentId.isTypeOnly ?? false) !==
                      (expectedId.isTypeOnly ?? false)
                  ) {
                    needsBlock = true;
                    break;
                  }
                }
                if (needsBlock) break;
              }
            }
          else needsBlock = true;

          if (needsBlock) {
            needsReordering = true;
            const [firstImport] = importNodes;
            const lastImport = importNodes[importNodes.length - 1];
            if (
              typeof firstImport !== 'undefined' &&
              typeof lastImport !== 'undefined'
            )
              blockFixData.push({
                blockKey,
                firstImport,
                lastImport,
                sortedGroups,
                orderedItems: items,
              });
          }
        }

        if (!needsReordering) return;

        // Report on the first import of the first block that needs fixing
        const [firstBlock] = blockFixData.sort(
          (a, b) =>
            (a.firstImport.range?.[0] ?? 0) - (b.firstImport.range?.[0] ?? 0),
        );
        if (typeof firstBlock === 'undefined') return;

        context.report({
          node: firstBlock.firstImport,
          message:
            'Imports should be sorted and grouped according to the specified rules',
          fix(fixer) {
            const fixes: ReturnType<typeof fixer.replaceTextRange>[] = [];

            for (const block of blockFixData) {
              const indentationByKey = new Map<string, string>();
              for (const { info, indentation } of block.orderedItems) {
                const key = `${info.source}:${info.type}:${info.identifiers
                  .map(
                    id =>
                      `${id.imported}${typeof id.local === 'undefined' ? '' : `:${id.local}`}${id.isTypeOnly === true ? ':type' : ''}`,
                  )
                  .join(',')}`;
                if (!indentationByKey.has(key))
                  indentationByKey.set(key, indentation);
              }

              const sortedStatements: string[] = [];
              for (const [groupIndex, groupImports] of enumerate(
                block.sortedGroups,
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

              if (
                typeof block.firstImport.range === 'undefined' ||
                typeof block.lastImport.range === 'undefined'
              )
                continue;

              const replacement = sortedStatements.join('\n');
              const firstImportLineStart =
                text.lastIndexOf('\n', block.firstImport.range[0]) + 1;
              const lastImportLineEnd = text.indexOf(
                '\n',
                block.lastImport.range[1],
              );
              const lastImportEnd =
                lastImportLineEnd === -1 ? text.length : lastImportLineEnd;

              fixes.push(
                fixer.replaceTextRange(
                  [firstImportLineStart, lastImportEnd],
                  replacement,
                ),
              );
            }

            return fixes;
          },
        });
      },
    };
  },
};
