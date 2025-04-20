/** @typedef {'code' | 'debug' | 'scaffold' | 'refactor' | 'testgen' | 'cicd' | 'docgen'} IntentMode */

/**
 * @typedef {Object} IntentDetectionResult
 * @property {IntentMode} mode - The detected mode
 * @property {number} confidence - Confidence score between 0 and 1
 * @property {string[]} keywords - The matched keywords
 */

/**
 * @typedef {Record<IntentMode, string[]>} KeywordMap
 */

module.exports = {
  /** @type {IntentMode[]} */
  VALID_MODES: ['code', 'debug', 'scaffold', 'refactor', 'testgen', 'cicd', 'docgen']
};