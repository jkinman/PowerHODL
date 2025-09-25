module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	extends: ['eslint:recommended', '@typescript-eslint/recommended', 'plugin:svelte/recommended'],
	plugins: ['@typescript-eslint'],
	ignorePatterns: ['*.cjs', '.svelte-kit/**', 'build/**', 'dist/**'],
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		}
	],
	settings: {
		'svelte3/typescript': () => require('typescript')
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte']
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	rules: {
		// Relaxed rules for migration
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/no-explicit-any': 'warn',
		'no-console': 'off', // Allow console for development
		'svelte/no-at-html-tags': 'warn' // Warn instead of error
	}
};
