import type { Rule } from 'eslint';
import type { ImportDeclaration, Program } from 'estree';
import { enumerate } from 'itertools';

import type { ImportNode } from './types.js';
import { extractImportInfo } from './utils/extract-import-info.js';
import { getImportGroupPriority } from './utils/get-import-group-priority.js';
import { sortImportsInGroup } from './utils/sort-imports-in-group.js';
import { detectFormattingPreferences } from './utils/detect-formatting-preferences.js';
import { generateImportStatement } from './utils/generate-import-statement.js';

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
        // Collect all import declarations
        const imports: ImportNode[] = [];
        const importNodes: ImportDeclaration[] = [];

        for (const statement of node.body) {
          if (statement.type === 'ImportDeclaration') {
            const importInfo = extractImportInfo(statement, text);
            imports.push(importInfo);
            importNodes.push(statement);
          }
        }

        if (imports.length <= 1) {
          return; // No sorting needed
        }

        // Group imports by priority
        const groups = new Map<number, ImportNode[]>();

        for (const importInfo of imports) {
          const priority = getImportGroupPriority(importInfo.source);
          const existingGroup = groups.get(priority);
          if (typeof existingGroup === 'undefined') {
            groups.set(priority, [importInfo]);
          } else {
            existingGroup.push(importInfo);
          }
        }

        // Sort groups by priority and sort within each group
        const sortedGroups = Array.from(groups.entries())
          .sort(([a], [b]) => a - b)
          .map(([_, groupImports]) => sortImportsInGroup(groupImports));

        // Generate the expected import order
        const expectedImports = sortedGroups.flat();

        // Check if current order matches expected order
        let needsReordering = false;
        for (let i = 0; i < imports.length; i++) {
          const current = imports[i];
          const expected = expectedImports[i];

          if (
            typeof current === 'undefined' ||
            typeof expected === 'undefined'
          ) {
            continue;
          }

          // Compare based on first identifier only (or source for side-effect imports)
          const [currentFirstId = current.source] = current.identifiers;
          const [expectedFirstId = expected.source] = expected.identifiers;

          if (
            current.source !== expected.source ||
            current.type !== expected.type ||
            currentFirstId !== expectedFirstId
          ) {
            needsReordering = true;
            break;
          }
        }

        if (needsReordering) {
          const [firstImport] = importNodes;
          const lastImport = importNodes[importNodes.length - 1];

          if (
            typeof firstImport === 'undefined' ||
            typeof lastImport === 'undefined'
          ) {
            return;
          }

          context.report({
            node: firstImport,
            message:
              'Imports should be sorted and grouped according to the specified rules',
            fix(fixer) {
              // Detect formatting preferences
              const preferences = detectFormattingPreferences(text);

              // Generate sorted import statements with proper grouping
              const sortedStatements: string[] = [];
              let currentGroupPriority: number | null = null;

              for (const [index, importInfo] of enumerate(expectedImports)) {
                const priority = getImportGroupPriority(importInfo.source);

                // Add blank line between groups (but not before the first group)
                if (
                  index > 0 &&
                  currentGroupPriority !== null &&
                  currentGroupPriority !== priority
                ) {
                  sortedStatements.push('');
                }

                sortedStatements.push(
                  generateImportStatement(importInfo, preferences),
                );
                currentGroupPriority = priority;
              }

              const replacement = sortedStatements.join('\n');

              if (
                typeof firstImport.range === 'undefined' ||
                typeof lastImport.range === 'undefined'
              ) {
                return null;
              }

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
