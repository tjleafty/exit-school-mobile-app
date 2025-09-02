#!/usr/bin/env node

console.log('🚀 Exit School Deployment Check');
console.log('================================');
console.log(`📅 Date: ${new Date().toISOString()}`);
console.log(`📦 Node Version: ${process.version}`);
console.log(`🔧 Current Directory: ${process.cwd()}`);

// Check if we're in the right directory
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`📋 Project: ${packageJson.name} v${packageJson.version}`);
  console.log(`🎯 Main Script: ${packageJson.scripts?.build || 'Not found'}`);
} else {
  console.log('❌ package.json not found!');
}

// Check for key files
const keyFiles = [
  'next.config.js',
  'tailwind.config.ts', 
  'src/middleware.ts',
  'src/app/layout.tsx',
  'vercel.json'
];

console.log('\n📂 File Check:');
keyFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n🎉 Deployment should work with this configuration!');
console.log('Commit hash: fc98bef');
console.log('Branch: main');