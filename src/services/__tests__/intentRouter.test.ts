const { describe, it, expect } = require('@jest/globals');
const { detectMode } = require('../intentRouter.js');

describe('intentRouter', () => {
  describe('detectMode', () => {
    // Scaffold mode tests
    it('returns scaffold for setup prompts', () => {
      expect(detectMode('Please scaffold a new project')).toBe('scaffold');
    });

    it('returns scaffold for setup-related prompts', () => {
      expect(detectMode('I need to setup a new React application')).toBe('scaffold');
    });

    it('returns scaffold for create new prompts', () => {
      expect(detectMode('Create new Express API with TypeScript')).toBe('scaffold');
    });

    // Refactor mode tests
    it('returns refactor for refactoring prompts', () => {
      expect(detectMode('Refactor this code to use async/await')).toBe('refactor');
    });

    it('returns refactor for cleanup prompts', () => {
      expect(detectMode('Cleanup this messy function')).toBe('refactor');
    });

    it('returns refactor for improvement prompts', () => {
      expect(detectMode('Improve the performance of this algorithm')).toBe('refactor');
    });

    it('returns refactor for optimization prompts', () => {
      expect(detectMode('Optimize this database query')).toBe('refactor');
    });

    // TestGen mode tests
    it('returns testgen for test generation prompts', () => {
      expect(detectMode('Generate unit tests for this class')).toBe('testgen');
    });

    it('returns testgen for spec-related prompts', () => {
      expect(detectMode('Create spec files for these components')).toBe('testgen');
    });

    it('returns testgen for integration test prompts', () => {
      expect(detectMode('Write integration tests for the API')).toBe('testgen');
    });

    // CICD mode tests
    it('returns cicd for deployment prompts', () => {
      expect(detectMode('Set up deployment to AWS')).toBe('cicd');
    });

    it('returns cicd for CI-related prompts', () => {
      expect(detectMode('Configure CI pipeline for this project')).toBe('cicd');
    });

    it('returns cicd for CD-related prompts', () => {
      expect(detectMode('Implement CD workflow for staging')).toBe('cicd');
    });

    it('returns cicd for GitHub Actions prompts', () => {
      expect(detectMode('Create a GitHub Action for testing')).toBe('cicd');
    });

    // DocGen mode tests
    it('returns docgen for documentation prompts', () => {
      expect(detectMode('Generate documentation for the API')).toBe('docgen');
    });

    it('returns docgen for README prompts', () => {
      expect(detectMode('Update the README with installation instructions')).toBe('docgen');
    });

    it('returns docgen for comment-related prompts', () => {
      expect(detectMode('Add JSDoc comments to these functions')).toBe('docgen');
    });

    // Default code mode tests
    it('returns code as default for general coding prompts', () => {
      expect(detectMode('Implement a login feature')).toBe('code');
    });

    it('returns code for prompts without specific keywords', () => {
      expect(detectMode('Fix the bug in the authentication module')).toBe('code');
    });

    // Case insensitivity tests
    it('is case insensitive when detecting modes', () => {
      expect(detectMode('REFACTOR this code')).toBe('refactor');
      expect(detectMode('Generate UNIT TESTS')).toBe('testgen');
      expect(detectMode('Update the README')).toBe('docgen');
    });

    // Mixed intent tests
    it('prioritizes based on order of checks when multiple intents are present', () => {
      // Since scaffold is checked first, it should return scaffold
      expect(detectMode('Scaffold a project with tests')).toBe('scaffold');
      
      // Since refactor is checked before testgen, it should return refactor
      expect(detectMode('Refactor and add tests')).toBe('refactor');
    });
  });
});