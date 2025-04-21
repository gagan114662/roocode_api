/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/services/__tests__/**/*.test.ts',
    '<rootDir>/src/services/__tests__/**/*.integration.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/services/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    '!src/services/**/*.d.ts',
    '!src/services/__tests__/**/*'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [1343] // ignore 'implicitly has any type' warnings
      }
    }
  },
  // Set timeout to 30 seconds for integration tests
  testTimeout: 30000,
  // Define test groups
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/services/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['.integration.test.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/services/__tests__/**/*.integration.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/services/__tests__/setup.ts']
    }
  ],
  // Only run integration tests if INTEGRATION env var is set
  testPathIgnorePatterns: [
    process.env.INTEGRATION ? [] : '.integration.test.ts'
  ]
};