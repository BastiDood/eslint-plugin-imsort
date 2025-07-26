import type { Rule } from 'eslint';
import type { ImportDeclaration, Program } from 'estree';
import { enumerate } from 'itertools';

import type { ImportNode } from './types.ts';

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
    if (namedIdentifiers.length <= 1) return true;

    const sortedNamed = [...namedIdentifiers].sort((a, b) =>
      a.imported.localeCompare(b.imported, void 0, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    return namedIdentifiers.every(
      (id, index) => id.imported === sortedNamed[index]?.imported,
    );
  }

  if (importInfo.type === 'named') {
    if (importInfo.identifiers.length <= 1) return true;

    const sortedIdentifiers = [...importInfo.identifiers].sort((a, b) =>
      a.imported.localeCompare(b.imported, void 0, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
    return importInfo.identifiers.every(
      (id, index) => id.imported === sortedIdentifiers[index]?.imported,
    );
  }

  return true;
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
        // Collect all import declarations
        const imports: ImportNode[] = [];
        const importNodes: ImportDeclaration[] = [];

        for (const statement of node.body)
          if (statement.type === 'ImportDeclaration') {
            const importInfo = extractImportInfo(statement, text);
            imports.push(importInfo);
            importNodes.push(statement);
          }

        if (imports.length === 0) return; // No imports to sort

        // Group imports by priority
        const groups = new Map<number, ImportNode[]>();

        for (const importInfo of imports) {
          const priority = getImportGroupPriority(importInfo.source);
          const existingGroup = groups.get(priority);
          if (typeof existingGroup === 'undefined')
            groups.set(priority, [importInfo]);
          else existingGroup.push(importInfo);
        }

        // Sort groups by priority and sort within each group
        const sortedGroups = Array.from(groups.entries())
          .sort(([a], [b]) => a - b)
          .map(([_, groupImports]) => sortImportsInGroup(groupImports));

        // Generate the expected import order
        const expectedImports = sortedGroups.flat();

        // Check if current order matches expected order OR if any identifiers are unsorted
        let needsReordering = false;

        // First check if any individual import has unsorted identifiers
        for (const importInfo of imports)
          if (!areIdentifiersSorted(importInfo)) {
            needsReordering = true;
            break;
          }

        // Then check if import order is correct (only if identifiers are sorted)
        if (!needsReordering && imports.length > 1)
          for (let i = 0; i < imports.length; i++) {
            const current = imports[i];
            const expected = expectedImports[i];

            if (
              typeof current === 'undefined' ||
              typeof expected === 'undefined'
            )
              continue;

            // Compare based on first identifier only (or source for side-effect imports)
            const currentFirstId =
              current.identifiers[0]?.imported ?? current.source;
            const expectedFirstId =
              expected.identifiers[0]?.imported ?? expected.source;

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
          )
            return;

          context.report({
            node: firstImport,
            message:
              'Imports should be sorted and grouped according to the specified rules',
            fix(fixer) {
              // Detect formatting preferences from the source text
              const globalPreferences = detectFormattingPreferences(text);

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
                )
                  sortedStatements.push('');

                // Detect formatting preferences for this specific import
                const importPreferences = detectFormattingPreferences(
                  text,
                  importInfo.text,
                );
                // Use global quote preference but import-specific trailing comma preference
                const preferences = {
                  ...globalPreferences,
                  useTrailingComma: importPreferences.useTrailingComma,
                };

                sortedStatements.push(
                  generateImportStatement(importInfo, preferences),
                );
                currentGroupPriority = priority;
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
