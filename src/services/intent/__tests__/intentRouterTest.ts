/** @typedef {import('../../../types/intent').IntentMode} IntentMode */

const { describe, it, expect } = require('@jest/globals');
const { IntentRouter, DEFAULT_MODE } = require('../intentRouter');

describe('IntentRouter', () => {
  describe('detectMode', () => {
    it('should detect code mode from creation keywords', () => {
      const result = IntentRouter.detectMode('create a new function to handle auth');
      expect(result.mode).toBe('code');
      expect(result.keywords).toContain('create');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect debug mode from error-related keywords', () => {
      const result = IntentRouter.detectMode('fix this bug in the authentication flow');
      expect(result.mode).toBe('debug');
      expect(result.keywords).toContain('fix');
      expect(result.keywords).toContain('bug');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should return default mode with low confidence when no keywords match', () => {
      const result = IntentRouter.detectMode('hello world');
      expect(result.mode).toBe(DEFAULT_MODE);
      expect(result.keywords).toHaveLength(0);
      expect(result.confidence).toBe(0.5);
    });

    it('should detect mode with highest keyword matches when multiple modes match', () => {
      const result = IntentRouter.detectMode('fix and improve the code by refactoring the authentication');
      expect(result.mode).toBe('refactor');
      expect(result.keywords).toContain('refactor');
      expect(result.keywords).toContain('improve');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should be case insensitive', () => {
      const result = IntentRouter.detectMode('IMPLEMENT a new FEATURE');
      expect(result.mode).toBe('code');
      expect(result.keywords).toContain('implement');
    });

    it('should detect scaffold mode from project creation keywords', () => {
      const result = IntentRouter.detectMode('scaffold a new React project with TypeScript');
      expect(result.mode).toBe('scaffold');
      expect(result.keywords).toContain('scaffold');
    });

    it('should detect testgen mode from testing keywords', () => {
      const result = IntentRouter.detectMode('generate unit tests for the auth service');
      expect(result.mode).toBe('testgen');
      expect(result.keywords).toContain('test');
    });

    it('should detect cicd mode from deployment keywords', () => {
      const result = IntentRouter.detectMode('setup a ci/cd pipeline for deployment');
      expect(result.mode).toBe('cicd');
      expect(result.keywords).toContain('ci/cd');
      expect(result.keywords).toContain('pipeline');
    });

    it('should detect docgen mode from documentation keywords', () => {
      const result = IntentRouter.detectMode('add documentation for the API endpoints');
      expect(result.mode).toBe('docgen');
      expect(result.keywords).toContain('documentation');
    });
  });
});