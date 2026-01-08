import { describe, expect, it } from 'vitest';

import type { ImportIdentifier } from '#types.ts';

import { areIdentifiersSorted, sortIdentifiers } from './sort.ts';

describe('sortIdentifiers', () => {
  it('should sort identifiers naturally with numbers', () => {
    const identifiers: ImportIdentifier[] = [
      { imported: 'item10' },
      { imported: 'item2' },
      { imported: 'item1' },
      { imported: 'item20' },
    ];
    const sorted = sortIdentifiers(identifiers);
    const sortedNames = sorted.map(id => id.imported);
    expect(sortedNames).toEqual(['item1', 'item2', 'item10', 'item20']);
  });
  it('should sort case-insensitively', () => {
    const identifiers: ImportIdentifier[] = [
      { imported: 'Zeus' },
      { imported: 'alpha' },
      { imported: 'Beta' },
      { imported: 'charlie' },
    ];
    const sorted = sortIdentifiers(identifiers);
    const sortedNames = sorted.map(id => id.imported);
    expect(sortedNames).toEqual(['alpha', 'Beta', 'charlie', 'Zeus']);
  });
  it('should handle mixed type and value imports', () => {
    const identifiers: ImportIdentifier[] = [
      { imported: 'customType' },
      { imported: 'CustomTypeValues', isTypeOnly: true },
    ];
    const sorted = sortIdentifiers(identifiers);
    const sortedNames = sorted.map(id => id.imported);
    expect(sortedNames).toEqual(['CustomTypeValues', 'customType']);
  });
  it('should preserve type-only flags', () => {
    const identifiers: ImportIdentifier[] = [
      { imported: 'helper' },
      { imported: 'Config', isTypeOnly: true },
      { imported: 'value' },
      { imported: 'User', isTypeOnly: true },
    ];
    const sorted = sortIdentifiers(identifiers);
    expect(sorted).toEqual([
      { imported: 'Config', isTypeOnly: true },
      { imported: 'helper' },
      { imported: 'User', isTypeOnly: true },
      { imported: 'value' },
    ]);
  });
  it('should handle empty array', () => {
    const identifiers: ImportIdentifier[] = [];
    const sorted = sortIdentifiers(identifiers);
    expect(sorted).toEqual([]);
  });
  it('should handle single identifier', () => {
    const identifiers: ImportIdentifier[] = [{ imported: 'test' }];
    const sorted = sortIdentifiers(identifiers);
    expect(sorted).toEqual([{ imported: 'test' }]);
  });
});
describe('areIdentifiersSorted', () => {
  it('should return true for already sorted identifiers', () => {
    const identifiers: ImportIdentifier[] = [
      { imported: 'alpha' },
      { imported: 'beta' },
      { imported: 'gamma' },
    ];
    expect(areIdentifiersSorted(identifiers)).toBe(true);
  });
  it('should return false for unsorted identifiers', () => {
    const identifiers: ImportIdentifier[] = [
      { imported: 'gamma' },
      { imported: 'alpha' },
      { imported: 'beta' },
    ];
    expect(areIdentifiersSorted(identifiers)).toBe(false);
  });
  it('should return true for empty array', () => {
    const identifiers: ImportIdentifier[] = [];
    expect(areIdentifiersSorted(identifiers)).toBe(true);
  });
  it('should return true for single identifier', () => {
    const identifiers: ImportIdentifier[] = [{ imported: 'test' }];
    expect(areIdentifiersSorted(identifiers)).toBe(true);
  });
  it('should handle natural sorting correctly', () => {
    const sorted: ImportIdentifier[] = [
      { imported: 'item1' },
      { imported: 'item2' },
      { imported: 'item10' },
    ];
    const unsorted: ImportIdentifier[] = [
      { imported: 'item1' },
      { imported: 'item10' },
      { imported: 'item2' },
    ];
    expect(areIdentifiersSorted(sorted)).toBe(true);
    expect(areIdentifiersSorted(unsorted)).toBe(false);
  });
});
