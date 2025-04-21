/**
 * Intent Router Service
 * 
 * This service analyzes user prompts to detect the appropriate mode
 * for handling the request based on keywords and context.
 */

/**
 * Detects the appropriate mode based on the content of a prompt
 * 
 * @param {string} prompt The user's input prompt
 * @returns {string} The detected mode (scaffold, refactor, testgen, cicd, docgen, or code as default)
 */
function detectMode(prompt) {
  const text = prompt.toLowerCase();
  
  if (text.includes('scaffold') || text.includes('setup') || text.includes('create new')) {
    return 'scaffold';
  }
  
  if (text.includes('refactor') || text.includes('cleanup') || text.includes('improve') || text.includes('optimize')) {
    return 'refactor';
  }
  
  if (text.includes('deploy') || text.includes('ci') || text.includes('cd') || text.includes('pipeline') || text.includes('github action')) {
    return 'cicd';
  }
  
  if (text.includes('test') || text.includes('spec') || text.includes('unit test') || text.includes('integration test')) {
    return 'testgen';
  }
  
  if (text.includes('doc') || text.includes('readme') || text.includes('documentation') || text.includes('comment')) {
    return 'docgen';
  }
  
  // Default to code mode if no specific intent is detected
  return 'code';
}

module.exports = { detectMode };