/**
 * Build Validation Script
 *
 * Validates the build output and ensures all critical assets are present
 */

import fs from 'fs';
import path from 'path';

const BUILD_DIR = 'build';
const REQUIRED_FILES = [
	'client/_app/immutable/entry/start.*.js',
	'client/_app/immutable/entry/app.*.js',
	'client/index.html'
];

function validateBuild() {
	console.log('🔍 Validating PowerHODL build...\n');

	// Check if build directory exists
	if (!fs.existsSync(BUILD_DIR)) {
		console.error('❌ Build directory not found!');
		process.exit(1);
	}

	console.log('✅ Build directory exists');

	// Check client directory
	const clientDir = path.join(BUILD_DIR, 'client');
	if (!fs.existsSync(clientDir)) {
		console.error('❌ Client build directory not found!');
		process.exit(1);
	}

	console.log('✅ Client build directory exists');

	// Check for essential files
	const clientFiles = fs.readdirSync(clientDir, { recursive: true });
	const hasIndexHtml = clientFiles.some((file) => file.includes('index.html'));
	const hasAppJs = clientFiles.some((file) => file.includes('app.') && file.endsWith('.js'));
	const hasStartJs = clientFiles.some((file) => file.includes('start.') && file.endsWith('.js'));

	if (!hasIndexHtml) {
		console.error('❌ index.html not found in build!');
		process.exit(1);
	}
	console.log('✅ index.html found');

	if (!hasAppJs) {
		console.error('❌ app.js not found in build!');
		process.exit(1);
	}
	console.log('✅ app.js found');

	if (!hasStartJs) {
		console.error('❌ start.js not found in build!');
		process.exit(1);
	}
	console.log('✅ start.js found');

	// Check build size
	const buildStats = fs.statSync(BUILD_DIR);
	console.log(`📊 Build directory size: ${(buildStats.size / 1024).toFixed(2)} KB`);

	console.log('\n🎉 Build validation passed!');
	console.log('🚀 Ready for deployment');
}

// Run validation
try {
	validateBuild();
} catch (error) {
	console.error('❌ Build validation failed:', error.message);
	process.exit(1);
}
