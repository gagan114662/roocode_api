/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	setupFilesAfterEnv: [
		"<rootDir>/src/setupTests.ts",
		"@vscode/webview-ui-toolkit/react/jsdom-registration"
	],
	injectGlobals: true,
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	transform: { 
		"^.+\\.(ts|tsx)$": ["ts-jest", { 
			tsconfig: { 
				jsx: "react-jsx", 
				module: "ESNext", 
				esModuleInterop: true 
			} 
		}] 
	},
	testMatch: ["<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}", "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}"],
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
		"^@/(.*)$": "<rootDir>/src/$1",
		"^vscrui$": "@vscode/webview-ui-toolkit/react",
		"^@vscode/webview-ui-toolkit/react$": "@vscode/webview-ui-toolkit/react"
	},
	transformIgnorePatterns: [
		"/node_modules/(?!(rehype-highlight|react-remark|unist-util-visit|unist-util-find-after|vfile|unified|bail|is-plain-obj|trough|vfile-message|unist-util-stringify-position|mdast-util-from-markdown|mdast-util-to-string|micromark|decode-named-character-reference|character-entities|markdown-table|zwitch|longest-streak|escape-string-regexp|unist-util-is|hast-util-to-text|@vscode/webview-ui-toolkit|@microsoft/fast-react-wrapper|@microsoft/fast-element|@microsoft/fast-foundation|@microsoft/fast-web-utilities|exenv-es6|vscrui)/)",
	],
	testEnvironmentOptions: {
		customExportConditions: ["node", "node-addons"],
	},
	reporters: [["jest-simple-dot-reporter", {}]],
	roots: ["<rootDir>/src"],
	moduleDirectories: ["node_modules", "src"],
}
