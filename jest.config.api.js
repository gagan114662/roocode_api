/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/api'],
    testMatch: [
        '**/integration.test.ts'
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
    testTimeout: 10000,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};