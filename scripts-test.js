#!/usr/bin/env node
/**
 * Quick Script Validation
 * Tests that key package.json scripts work correctly
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Quick Script Validation');
console.log('==========================\n');

// Check package.json exists and is valid
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('✅ package.json is valid');
    console.log(`   Project: ${pkg.name}`);
    console.log(`   Version: ${pkg.version}`);
    console.log(`   Scripts: ${Object.keys(pkg.scripts).length} defined\n`);
    
    // Test build script (should be fast)
    console.log('🔨 Testing build script...');
    try {
        const buildOutput = execSync('npm run build', { encoding: 'utf8', timeout: 5000 });
        console.log('✅ Build script works');
        console.log(`   Output: ${buildOutput.trim()}\n`);
    } catch (error) {
        console.log('❌ Build script failed');
        console.log(`   Error: ${error.message}\n`);
    }
    
    // Test strategy loading (should be fast)
    console.log('📊 Testing strategy script...');
    try {
        const strategyOutput = execSync('npm run strategy', { encoding: 'utf8', timeout: 5000 });
        console.log('✅ Strategy script works');
        console.log(`   Output: ${strategyOutput.trim()}\n`);
    } catch (error) {
        console.log('❌ Strategy script failed');
        console.log(`   Error: ${error.message.slice(0, 100)}\n`);
    }
    
    // List all available scripts
    console.log('📋 Available Scripts:');
    console.log('====================');
    Object.entries(pkg.scripts).forEach(([name, command]) => {
        console.log(`   ${name}: ${command}`);
    });
    
    console.log('\n🎯 Ready for development!');
    console.log('   Run: yarn dev (start development server)');
    console.log('   Run: yarn start (run trading analysis)');
    console.log('   Run: yarn deploy (deploy to Vercel)');
    
} catch (error) {
    console.log('❌ package.json error:', error.message);
}
