module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/e2e/tests/**/*.spec.ts'],
  setupFilesAfterEnv: ['./e2e/tests/helpers/setup.ts'],
  testTimeout: 30000,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/e2e',
      outputName: 'junit.xml',
    }]
  ]
};
