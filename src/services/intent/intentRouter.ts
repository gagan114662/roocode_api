/** @typedef {'code' | 'debug' | 'scaffold' | 'refactor' | 'testgen' | 'cicd' | 'docgen'} IntentMode */

/**
 * @typedef {Object} IntentDetectionResult
 * @property {IntentMode} mode - The detected mode
 * @property {number} confidence - Confidence score between 0 and 1
 * @property {string[]} keywords - The matched keywords
 */

/** @type {Record<IntentMode, string[]>} */
const KEYWORD_MAP = {
  code: ['create', 'implement', 'write', 'add', 'build', 'generate'],
  debug: ['fix', 'debug', 'error', 'issue', 'problem', 'bug'],
  scaffold: ['scaffold', 'initialize', 'setup', 'create project', 'boilerplate'],
  refactor: ['refactor', 'improve', 'clean', 'optimize', 'restructure'],
  testgen: ['test', 'unit test', 'integration test', 'testing'],
  cicd: ['pipeline', 'deploy', 'ci/cd', 'continuous integration', 'automation'],
  docgen: ['document', 'docs', 'documentation', 'comment', 'explain']
};

/** @type {IntentMode} */
const DEFAULT_MODE = 'code';
const CONFIDENCE_THRESHOLD = 0.7;

class IntentRouter {
  /**
   * Detects the most likely mode based on the input prompt
   * @param {string} prompt User's input prompt
   * @returns {IntentDetectionResult} Detection result containing mode and confidence
   */
  static detectMode(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    /** @type {Map<IntentMode, string[]>} */
    const matchedKeywords = new Map();

    // Find all matching keywords for each mode
    Object.entries(KEYWORD_MAP).forEach(([mode, keywords]) => {
      const matches = keywords.filter(keyword => 
        normalizedPrompt.includes(keyword.toLowerCase())
      );
      if (matches.length > 0) {
        matchedKeywords.set(/** @type {IntentMode} */ (mode), matches);
      }
    });

    if (matchedKeywords.size === 0) {
      return {
        mode: DEFAULT_MODE,
        confidence: 0.5,
        keywords: []
      };
    }

    // Calculate confidence based on number of keyword matches
    let maxMatches = 0;
    /** @type {IntentMode} */
    let bestMode = DEFAULT_MODE;
    /** @type {string[]} */
    let matchedKeywordsList = [];

    matchedKeywords.forEach((keywords, mode) => {
      if (keywords.length > maxMatches) {
        maxMatches = keywords.length;
        bestMode = mode;
        matchedKeywordsList = keywords;
      }
    });

    // Calculate confidence based on percentage of matched keywords and add base confidence
    const confidence = Math.min(
      (maxMatches / KEYWORD_MAP[bestMode].length) + 0.5,
      1.0
    );

    return {
      mode: bestMode,
      confidence,
      keywords: matchedKeywordsList
    };
  }

  /**
   * Optional: Use LLM to classify the intent with higher accuracy
   * To be implemented in future iterations
   * @param {string} prompt User's input prompt
   * @returns {Promise<IntentDetectionResult>} LLM-based classification result
   */
  static async classifyWithLLM(prompt) {
    // TODO: Implement LLM-based classification
    return this.detectMode(prompt);
  }
}

module.exports = {
  IntentRouter,
  DEFAULT_MODE,
  CONFIDENCE_THRESHOLD
};