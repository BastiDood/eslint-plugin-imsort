import type { ImportNode, ImportTypeOrder } from '../types.ts';

export function sortImportsInGroup(imports: ImportNode[]) {
  return imports.sort((a, b) => {
    // First sort by import type priority
    const typeOrder: ImportTypeOrder = {
      'side-effect': 0, // Side-effect imports floated to top
      namespace: 1,
      default: 2,
      named: 3,
    };
    const aTypeOrder = typeOrder[a.type] ?? 999;
    const bTypeOrder = typeOrder[b.type] ?? 999;
    const typeDiff = aTypeOrder - bTypeOrder;
    if (typeDiff !== 0) return typeDiff;

    // Type-only vs value imports are treated the same for sorting purposes

    // Sort by first identifier (alphabetically)
    const aFirstId = a.identifiers[0]?.imported ?? a.source;
    const bFirstId = b.identifiers[0]?.imported ?? b.source;
    if (typeof aFirstId !== 'undefined' && typeof bFirstId !== 'undefined') {
      const identifierComparison = aFirstId.localeCompare(bFirstId, void 0, {
        numeric: true,
        sensitivity: 'base',
      });
      if (identifierComparison !== 0) return identifierComparison;
    }

    // If first identifier is the same, fall back to source path
    const sourceComparison = a.source.localeCompare(b.source, void 0, {
      numeric: true,
      sensitivity: 'base',
    });
    if (sourceComparison !== 0) return sourceComparison;

    return 0;
  });
}
