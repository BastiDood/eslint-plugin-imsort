import { describe, expect, it } from 'vitest';

import { detectFormattingPreferences } from './detect-formatting-preferences.js';

describe('detectFormattingPreferences', () => {
  describe('quote style detection', () => {
    it('should prefer single quotes when they are more common', () => {
      const sourceText = `
        import React from 'react';
        import { useState } from 'react';
        import axios from 'axios';
        import lodash from "lodash";
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
    });
    it('should prefer double quotes when they are more common', () => {
      const sourceText = `
        import React from "react";
        import { useState } from "react";
        import axios from "axios";
        import lodash from 'lodash';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(false);
    });
    it('should handle equal counts by preferring double quotes (false)', () => {
      const sourceText = `
        import React from 'react';
        import axios from "axios";
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(false);
    });
    it('should handle no imports by defaulting to double quotes', () => {
      const sourceText = `
        const x = 5;
        console.log('hello');
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(false);
    });
    it('should ignore quotes outside of import statements', () => {
      const sourceText = `
        import React from 'react';
        const message = "This should not affect quote detection";
        console.log('Neither should this');
        import { useState } from 'react';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
    });
    it('should handle complex import paths with quotes', () => {
      const sourceText = `
        import component from '@/components/ui/button';
        import utils from '~/lib/utils';
        import config from '../config/app.config';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
    });
  });
  describe('trailing comma detection', () => {
    it('should detect trailing commas in named imports', () => {
      const sourceText = `
        import { useState, useEffect, } from 'react';
        import { map, filter, } from 'lodash';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useTrailingComma).toBe(true);
    });
    it('should detect no trailing commas', () => {
      const sourceText = `
        import { useState, useEffect } from 'react';
        import { map, filter } from 'lodash';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useTrailingComma).toBe(false);
    });
    it('should handle mixed scenarios by detecting any trailing comma', () => {
      const sourceText = `
        import { useState, useEffect } from 'react';
        import { map, filter, } from 'lodash';
        import { debounce } from 'lodash';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useTrailingComma).toBe(true);
    });
    it('should ignore trailing commas in other contexts', () => {
      const sourceText = `
        import { useState } from 'react';
        const array = [1, 2, 3, ];
        const obj = { a: 1, b: 2, };
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useTrailingComma).toBe(false);
    });
    it('should handle whitespace around trailing commas', () => {
      const sourceText = `
        import { useState,useEffect ,  } from 'react';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useTrailingComma).toBe(true);
    });
    it('should handle single import without comma', () => {
      const sourceText = `
        import { useState } from 'react';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useTrailingComma).toBe(false);
    });
  });
  describe('complex real-world scenarios', () => {
    it('should handle TypeScript import syntax', () => {
      const sourceText = `
        import type { FC } from 'react';
        import type { Props, State, } from './types';
        import { useState } from 'react';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
      expect(preferences.useTrailingComma).toBe(true);
    });
    it('should handle multiline imports', () => {
      const sourceText = `
        import {
          useState,
          useEffect,
          useCallback,
        } from 'react';
        import { map } from "lodash";
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(false);
      expect(preferences.useTrailingComma).toBe(true);
    });
    it('should handle side-effect imports', () => {
      const sourceText = `
        import 'polyfill';
        import "styles.css";
        import { Component } from 'react';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
      expect(preferences.useTrailingComma).toBe(false);
    });
    it('should handle namespace imports', () => {
      const sourceText = `
        import * as React from 'react';
        import * as utils from "lodash";
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(false); // Equal count, defaults to false
      expect(preferences.useTrailingComma).toBe(false);
    });
    it('should handle default + named imports', () => {
      const sourceText = `
        import React, { useState, useEffect, } from 'react';
        import axios, { AxiosResponse } from 'axios';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
      expect(preferences.useTrailingComma).toBe(true);
    });
  });
  describe('comprehensive edge cases', () => {
    it('should handle empty string', () => {
      const preferences = detectFormattingPreferences('');
      expect(preferences.useSingleQuotes).toBe(false);
      expect(preferences.useTrailingComma).toBe(false);
    });
    it('should handle malformed import syntax gracefully', () => {
      const sourceText = `
        import from 'nowhere';
        import 'valid-import';
        import { } from 'empty';
      `;
      expect(() => detectFormattingPreferences(sourceText)).not.toThrow();
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
    });
    it('should handle import statements with nested quotes', () => {
      const sourceText = `
        import { func } from 'module-with-"quotes"';
        import { other } from "module-with-'quotes'";
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(false); // Equal count
    });
    it('should handle case sensitivity in import detection', () => {
      const sourceText = `
        IMPORT { test } from 'module';
        import { real } from 'module';
      `;
      const preferences = detectFormattingPreferences(sourceText);
      expect(preferences.useSingleQuotes).toBe(true);
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
