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

    // Then sort by source for different sources within the same type
    const sourceComparison = a.source.localeCompare(b.source, void 0, {
      numeric: true,
      sensitivity: 'base',
    });
    if (sourceComparison !== 0) return sourceComparison;

    // Finally sort by first identifier within the same source and type
    const aFirstId = a.identifiers[0]?.imported ?? a.source;
    const bFirstId = b.identifiers[0]?.imported ?? b.source;

    if (typeof aFirstId === 'undefined' || typeof bFirstId === 'undefined')
      return 0;

    return aFirstId.localeCompare(bFirstId, void 0, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}
