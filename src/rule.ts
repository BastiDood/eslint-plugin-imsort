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

/** Check if identifiers within an import are sorted */
function areIdentifiersSorted(importInfo: ImportNode): boolean {
  if (importInfo.type === 'side-effect' || importInfo.type === 'namespace')
    return true; // These don't have sortable identifiers

  if (importInfo.type === 'default') {
    if (importInfo.identifiers.length <= 1) return true; // Just default import
    // For default + named imports, check if named imports (after first) are sorted
    const namedIdentifiers = importInfo.identifiers.slice(1);
    return areIdentifiersSortedArray(namedIdentifiers);
  }

  if (importInfo.type === 'named')
    return areIdentifiersSortedArray(importInfo.identifiers);

  return true;
}

/** Generate group key for an import */
function getGroupKey(importInfo: ImportNode) {
  return getImportGroupPriority(importInfo.source);
}

/** Check if there are sufficient blank lines between two import nodes */
function hasBlankLineBetween(
  prevNode: ImportDeclaration,
  currentNode: ImportDeclaration,
  text: string,
): boolean {
  if (
    typeof prevNode.range === 'undefined' ||
    typeof currentNode.range === 'undefined'
  )
    return false;

  const textBetween = text.slice(prevNode.range[1], currentNode.range[0]);
  const newlineCount = (textBetween.match(/\n/gu) || []).length;
  return newlineCount >= 2;
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
        // Collect import declarations and their parsed info in a single pass
        const importData: {
          node: ImportDeclaration;
          info: ImportNode;
        }[] = [];

        for (const statement of node.body)
          if (statement.type === 'ImportDeclaration') {
            const importInfo = extractImportInfo(statement, text);
            importData.push({ node: statement, info: importInfo });
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

        // Single validation pass that checks all conditions
        let needsReordering = false;

        // Check identifiers sorting, blank lines, and import order in one loop
        for (const [i, importInfo] of enumerate(imports)) {
          if (typeof importInfo === 'undefined') continue;

          // Check if identifiers are sorted
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

          // Check import order (only if we have an expected import to compare against)
          const expectedImport = expectedImports[i];
          if (typeof expectedImport !== 'undefined') {
            // Compare the entire import structure, not just the first identifier
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
              // Generate sorted import statements with proper grouping
              const sortedStatements: string[] = [];

              // Process each group separately to maintain group boundaries
              for (const [groupIndex, groupImports] of enumerate(
                sortedGroups,
              )) {
                // Add blank line before this group (but not before the first group)
                if (groupIndex > 0) sortedStatements.push('');

                // Process imports within this group
                for (const importInfo of groupImports) {
                  // Preserve the original formatting of each import
                  const preferences = detectFormattingPreferences(
                    text,
                    importInfo.text,
                  );

                  sortedStatements.push(
                    generateImportStatement(importInfo, preferences),
                  );
                }
              }

              const replacement = sortedStatements.join('\n');

              if (
                typeof firstImport.range === 'undefined' ||
                typeof lastImport.range === 'undefined'
              )
                return null;

              return fixer.replaceTextRange(
                [firstImport.range[0], lastImport.range[1]],
                replacement,
              );
            },
          });
        }
      },
    };
  },
};
