/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/api'],
    testMatch: [
        '**/integration.test.ts',
        '**/__tests__/**/*.test.ts'
    ],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'src/api/tsconfig.json'
            }
        ]
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['dotenv/config'],
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    verbose: true,
    detectOpenHandles: true,
    forceExit: true,
    testTimeout: 30000,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    // Optionally run only unmocked tests
    testPathIgnorePatterns: process.env.NO_MOCKS ? ['/__mocks__/', '\\.mock\\.'] : []
}