import { qaService } from './src/services/qa/QAService';
import * as path from 'path';

async function runQAServiceTest() {
  console.log('Running QA Service Integration Test');
  console.log('===================================');
  
  const testProjectPath = path.join(__dirname, 'test-project');
  console.log(`Test project path: ${testProjectPath}`);
  
  console.log('\n1. Running TypeScript compilation check:');
  const typeCheckResult = await qaService.runTypeCheck(testProjectPath);
  console.log(`Success: ${typeCheckResult.success}`);
  console.log(`Output: ${typeCheckResult.output}`);
  if (typeCheckResult.error) {
    console.log(`Error: ${typeCheckResult.error}`);
  }
  
  console.log('\n2. Running ESLint check:');
  const lintResult = await qaService.runLint(testProjectPath);
  console.log(`Success: ${lintResult.success}`);
  console.log(`Output: ${lintResult.output}`);
  if (lintResult.error) {
    console.log(`Error: ${lintResult.error}`);
  }
  
  console.log('\n3. Running tests:');
  const testResult = await qaService.runTests(testProjectPath);
  console.log(`Success: ${testResult.success}`);
  console.log(`Output: ${testResult.output}`);
  if (testResult.error) {
    console.log(`Error: ${testResult.error}`);
  }
  
  console.log('\n4. Running all QA checks:');
  const allResults = await qaService.runAll(testProjectPath);
  console.log(`Total checks: ${allResults.length}`);
  console.log(`Passed checks: ${allResults.filter(r => r.success).length}`);
  console.log(`Failed checks: ${allResults.filter(r => !r.success).length}`);
  
  console.log('\nQA Service Integration Test Complete');
}

// Run the test
runQAServiceTest().catch(error => {
  console.error('Test failed:', error);
});