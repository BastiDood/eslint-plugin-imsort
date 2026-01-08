import { describe, expect, it } from 'vitest';

import { detectFormattingPreferences } from './detect-formatting-preferences.js';

describe('detectFormattingPreferences', () => {
  describe('quote style detection', () => {
    it('should detect single quotes from import text', () => {
      const importText = "import { Component } from 'react';";
      const preferences = detectFormattingPreferences(importText);
      expect(preferences.useSingleQuotes).toBe(true);
    });

    it('should detect double quotes from import text', () => {
      const importText = 'import { Component } from "react";';
      const preferences = detectFormattingPreferences(importText);
      expect(preferences.useSingleQuotes).toBe(false);
    });

    it('should default to single quotes when no import text provided', () => {
      const preferences = detectFormattingPreferences();
      expect(preferences.useSingleQuotes).toBe(true);
    });

    it('should default to single quotes when import text has no clear preference', () => {
      const importText =
        'import { Component } from "react"; import { Other } from \'other\';';
      const preferences = detectFormattingPreferences(importText);
      expect(preferences.useSingleQuotes).toBe(true);
    });
  });

  describe('trailing comma detection', () => {
    it('should always return false for trailing commas', () => {
      const importText = "import { useState, useEffect, } from 'react';";
      const preferences = detectFormattingPreferences(importText);
      expect(preferences.useTrailingComma).toBe(false);
    });

    it('should always return false for trailing commas even with mixed formatting', () => {
      const importText = "import { useState, useEffect } from 'react';";
      const preferences = detectFormattingPreferences(importText);
      expect(preferences.useTrailingComma).toBe(false);
    });
  });

  describe('return value structure', () => {
    it('should return all required properties', () => {
      const preferences = detectFormattingPreferences(
        "import test from 'module';",
      );

      expect(preferences).toHaveProperty('useSingleQuotes');
      expect(preferences).toHaveProperty('useTrailingComma');

      expect(typeof preferences.useSingleQuotes).toBe('boolean');
      expect(typeof preferences.useTrailingComma).toBe('boolean');
    });
  });
});
