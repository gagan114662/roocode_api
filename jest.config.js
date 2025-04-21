/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: {
					module: "CommonJS",
					moduleResolution: "node",
					esModuleInterop: true,
					allowJs: true,
				},
				diagnostics: false,
				isolatedModules: true,
			},
		],
	},
	testMatch: ["**/__tests__/**/*.test.ts"],
	// Platform-specific test configuration
	testPathIgnorePatterns: [
		// Skip platform-specific tests based on environment
		...(process.platform === "win32" ? [".*\\.bash\\.test\\.ts$"] : [".*\\.cmd\\.test\\.ts$"]),
		// PowerShell tests are conditionally skipped in the test files themselves using the setupFilesAfterEnv
	],
	moduleNameMapper: {
		"vscode": "<rootDir>/src/__tests__/helpers/vscode-env.ts",
		"globby": "<rootDir>/src/__tests__/helpers/globby-mock.ts"
	},
	transformIgnorePatterns: [
		"node_modules/(?!(@vscode|globby|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|strip-ansi|ansi-regex|delay|p-wait-for|fastest-levenshtein|strip-bom|fzf|os-name|reconnecting-eventsource)/)"
	],
	roots: ["<rootDir>/src", "<rootDir>/webview-ui/src"],
	modulePathIgnorePatterns: [".vscode-test"],
	reporters: [["jest-simple-dot-reporter", {}]],

	setupFilesAfterEnv: ["<rootDir>/src/integrations/terminal/__tests__/setupTerminalTests.ts"],
}
