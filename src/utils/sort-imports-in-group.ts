import type { ImportNode, ImportTypeOrder } from '../types.js';

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

    // Then sort by first identifier (or source for side-effect imports)
    const [aFirstId = a.source] = a.identifiers;
    const [bFirstId = b.source] = b.identifiers;

    if (typeof aFirstId === 'undefined' || typeof bFirstId === 'undefined') {
      return 0;
    }

    return aFirstId.localeCompare(bFirstId, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}
