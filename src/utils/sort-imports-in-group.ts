import type { ImportNode, ImportTypeOrder } from '../types.ts';

import { compareIdentifiers, compareSources } from './compare.ts';

const TYPE_ORDER: ImportTypeOrder = {
  'side-effect': 0,
  namespace: 1,
  default: 2,
  named: 3,
};

function stripTypePrefix(id: string) {
  return id.startsWith('type ') ? id.slice(5) : id;
}

export function sortImportsInGroup(imports: ImportNode[]) {
  return imports.sort((a, b) => {
    // First sort by import type priority
    const aTypeOrder = TYPE_ORDER[a.type] ?? 999;
    const bTypeOrder = TYPE_ORDER[b.type] ?? 999;
    const typeDiff = aTypeOrder - bTypeOrder;
    if (typeDiff !== 0) return typeDiff;

    // Type-only vs value imports are treated the same for sorting purposes

    // Sort by first identifier (alphabetically), ignoring 'type' keyword
    const [aFirstIdObj] = a.identifiers;
    const [bFirstIdObj] = b.identifiers;
    const aFirstId = aFirstIdObj?.imported ?? a.source;
    const bFirstId = bFirstIdObj?.imported ?? b.source;

    // Strip 'type ' prefix for comparison but preserve original for output
    const aCompareId = stripTypePrefix(aFirstId);
    const bCompareId = stripTypePrefix(bFirstId);

    const identifierComparison = compareIdentifiers(aCompareId, bCompareId);
    if (identifierComparison !== 0) return identifierComparison;

    // If first identifier is the same, fall back to source path
    const sourceComparison = compareSources(a.source, b.source);
    if (sourceComparison !== 0) return sourceComparison;

    return 0;
  });
}
